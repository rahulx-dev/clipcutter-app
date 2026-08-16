import asyncio
import logging
import shutil
import uuid
from pathlib import Path

import yt_dlp
from fastapi import UploadFile

from app.core.config import settings


logger = logging.getLogger("clipcutter.downloader")


def _get_js_runtime_opts() -> dict:
    """
    Detect JS runtime for yt-dlp EJS challenge solving.
    Deno is preferred.
    """
    deno_path = shutil.which("deno")

    if deno_path:
        return {
            "deno": {
                "path": deno_path
            }
        }

    node_path = shutil.which("node")

    if node_path:
        return {
            "node": {
                "path": node_path
            }
        }

    return {}


def _get_extractor_args() -> dict:
    """
    Configure YouTube with bgutil PO-token provider.

    Current yt-dlp recommendation is to use a PO-token
    provider with the mweb client.
    """
    return {
        "youtube": {
            "player_client": ["mweb"]
        },
        "youtubepot-bgutilhttp": {
            "base_url": "http://127.0.0.1:4416"
        }
    }


async def download_youtube(
    url: str,
    output_dir: Path
) -> dict:

    output_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    temp_prefix = str(uuid.uuid4())[:8]

    def _download():

        base_opts = {
            "noplaylist": True,

            "outtmpl": str(
                output_dir /
                f"%(id)s_{temp_prefix}.%(ext)s"
            ),

            "quiet": False,
            "no_warnings": False,

            "geo_bypass": True,
            "nocheckcertificate": True,

            "socket_timeout": 30,
            "retries": 5,
            "fragment_retries": 5,

            # Let yt-dlp choose the best compatible
            # video/audio streams.
            "format": (
                "bestvideo*+bestaudio/"
                "best"
            ),

            "merge_output_format": "mp4",

            # EJS runtime
            "js_runtimes": _get_js_runtime_opts(),

            # bgutil PO-token provider
            "extractor_args": _get_extractor_args(),

            # Helpful HTTP settings
            "http_headers": {
                "Accept-Language": "en-US,en;q=0.9"
            },
        }

        # ---------------------------------------------------------
        # Cookies
        # ---------------------------------------------------------

        if (
            settings.YOUTUBE_COOKIES_FILE
            and Path(
                settings.YOUTUBE_COOKIES_FILE
            ).exists()
        ):
            base_opts["cookiefile"] = str(
                Path(
                    settings.YOUTUBE_COOKIES_FILE
                ).resolve()
            )

        elif settings.YOUTUBE_COOKIES:

            cookie_tmp = (
                output_dir /
                f"cookies_{temp_prefix}.txt"
            )

            cookie_tmp.write_text(
                settings.YOUTUBE_COOKIES,
                encoding="utf-8"
            )

            base_opts["cookiefile"] = str(
                cookie_tmp
            )

        # ---------------------------------------------------------
        # Proxy
        # ---------------------------------------------------------

        if settings.YOUTUBE_PROXY:
            base_opts["proxy"] = (
                settings.YOUTUBE_PROXY
            )

        # ---------------------------------------------------------
        # Log configuration
        # ---------------------------------------------------------

        logger.info(
            "[Downloader] Starting YouTube download"
        )

        logger.info(
            "[Downloader] PO Token provider: "
            "http://127.0.0.1:4416"
        )

        logger.info(
            "[Downloader] JS runtime: %s",
            _get_js_runtime_opts()
        )

        logger.info(
            "[Downloader] YouTube client: mweb"
        )

        # ---------------------------------------------------------
        # Download
        # ---------------------------------------------------------

        vid_id = ""

        try:

            with yt_dlp.YoutubeDL(
                base_opts
            ) as ydl:

                info = ydl.extract_info(
                    url,
                    download=True
                )

                vid_id = info.get(
                    "id",
                    ""
                )

                title = info.get(
                    "title",
                    "YouTube Video"
                )

                duration = int(
                    info.get(
                        "duration"
                    ) or 0
                )

                matched_file = (
                    _find_downloaded_file(
                        output_dir,
                        vid_id,
                        temp_prefix
                    )
                )

                if not matched_file:
                    raise RuntimeError(
                        "YouTube download completed "
                        "but output file was not found."
                    )

                logger.info(
                    "[Downloader] Download successful: %s",
                    matched_file
                )

                return {
                    "title": title,
                    "duration": duration,
                    "file_path": str(
                        matched_file.resolve()
                    ),
                    "video_id": vid_id
                }

        except Exception as e:

            logger.exception(
                "[Downloader] YouTube download failed"
            )

            _cleanup_partial_files(
                output_dir,
                vid_id,
                temp_prefix
            )

            err_str = str(e).lower()

            if (
                "sign in to confirm" in err_str
                or "not a bot" in err_str
                or "bot verification" in err_str
                or "http error 429" in err_str
                or "http error 403" in err_str
            ):
                raise RuntimeError(
                    "YouTube rejected the processing server "
                    "request. PO-token/provider or YouTube "
                    "server-side verification is still blocking "
                    "this request."
                )

            if (
                "private video" in err_str
                or "video unavailable" in err_str
                or "video has been removed" in err_str
            ):
                raise RuntimeError(
                    "This YouTube video is unavailable, private, "
                    "or restricted."
                )

            if "no video formats found" in err_str:
                raise RuntimeError(
                    "YouTube did not provide a compatible "
                    "video format."
                )

            raise RuntimeError(
                f"YouTube download failed: {e}"
            )

    # -------------------------------------------------------------
    # Hard timeout
    # -------------------------------------------------------------

    try:

        return await asyncio.wait_for(
            asyncio.to_thread(
                _download
            ),
            timeout=120
        )

    except asyncio.TimeoutError:

        logger.error(
            "[Downloader] YouTube download timed out"
        )

        raise RuntimeError(
            "YouTube download timed out. "
            "Please try again or upload the video directly."
        )


def _find_downloaded_file(
    output_dir: Path,
    vid_id: str,
    prefix: str
) -> Path | None:

    if not vid_id:
        return None

    # Exact generated filename
    for file in output_dir.glob(
        f"{vid_id}_{prefix}.*"
    ):

        if (
            file.is_file()
            and file.suffix.lower()
            in {
                ".mp4",
                ".mkv",
                ".webm",
                ".mov"
            }
            and not file.name.endswith(".part")
        ):
            return file

    # Fallback by video ID
    for file in output_dir.glob(
        f"{vid_id}*"
    ):

        if (
            file.is_file()
            and file.suffix.lower()
            in {
                ".mp4",
                ".mkv",
                ".webm",
                ".mov"
            }
            and not file.name.endswith(".part")
        ):
            return file

    return None


def _cleanup_partial_files(
    output_dir: Path,
    vid_id: str,
    prefix: str
):
    try:

        patterns = (
            [
                f"*{prefix}*",
                f"*{vid_id}*.part",
                f"*{vid_id}*.ytdl"
            ]
            if vid_id
            else [
                f"*{prefix}*"
            ]
        )

        for pattern in patterns:

            for file in output_dir.glob(
                pattern
            ):

                if file.is_file():

                    try:
                        file.unlink(
                            missing_ok=True
                        )
                    except Exception:
                        pass

    except Exception:
        pass


async def save_uploaded_file(
    file: UploadFile,
    output_dir: Path
) -> dict:

    output_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    ext = (
        file.filename.split(".")[-1]
        if file.filename
        and "." in file.filename
        else "mp4"
    )

    file_id = str(
        uuid.uuid4()
    )

    file_path = (
        output_dir /
        f"{file_id}.{ext}"
    )

    def _save():

        with open(
            file_path,
            "wb"
        ) as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )

    await asyncio.to_thread(
        _save
    )

    return {
        "title": (
            file.filename
            or "Uploaded Video"
        ),
        "file_path": str(
            file_path.resolve()
        )
    }