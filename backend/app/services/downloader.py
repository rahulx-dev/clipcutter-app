import asyncio
from pathlib import Path
from fastapi import UploadFile
import yt_dlp
import uuid
import shutil
import logging

from app.core.config import settings

logger = logging.getLogger("clipcutter.downloader")


def _get_js_runtime_opts() -> dict:
    """Detect available JS runtime for yt-dlp EJS challenge execution."""
    deno_path = shutil.which("deno")
    if deno_path:
        return {"deno": {"path": deno_path}}

    node_path = shutil.which("node")
    if node_path:
        return {"node": {"path": node_path}}

    return {}


def _get_pot_extractor_args(player_client=None) -> dict:
    """Build YouTube extractor args while preserving PO-token provider."""
    youtube_args = {}

    if player_client:
        youtube_args["player_client"] = [player_client]

    return {
        "youtube": youtube_args,
        "youtubepot-bgutilhttp": {
            "base_url": "http://127.0.0.1:4416"
        },
    }


async def download_youtube(url: str, output_dir: Path) -> dict:
    """
    Download a YouTube video using yt-dlp + EJS + bgutil PO-token provider.
    Uses multiple YouTube clients as fallback.
    """

    output_dir.mkdir(parents=True, exist_ok=True)
    temp_prefix = str(uuid.uuid4())[:8]

    def _download():
        base_opts = {
            "noplaylist": True,
            "merge_output_format": "mp4",
            "outtmpl": str(
                output_dir / f"%(id)s_{temp_prefix}.%(ext)s"
            ),
            "quiet": False,
            "no_warnings": False,
            "geo_bypass": True,
            "nocheckcertificate": True,
            "socket_timeout": 25,
            "retries": 3,
            "fragment_retries": 3,

            # PO-token provider
            "extractor_args": _get_pot_extractor_args(),

            # Helpful for modern YouTube extraction
            "js_runtimes": _get_js_runtime_opts(),
        }

        # Remove empty JS runtime configuration
        if not base_opts["js_runtimes"]:
            base_opts.pop("js_runtimes", None)

        # Optional cookies
        if (
            settings.YOUTUBE_COOKIES_FILE
            and Path(settings.YOUTUBE_COOKIES_FILE).exists()
        ):
            base_opts["cookiefile"] = str(
                Path(settings.YOUTUBE_COOKIES_FILE).resolve()
            )

        elif settings.YOUTUBE_COOKIES:
            cookie_tmp = output_dir / f"cookies_{temp_prefix}.txt"
            cookie_tmp.write_text(
                settings.YOUTUBE_COOKIES,
                encoding="utf-8"
            )
            base_opts["cookiefile"] = str(cookie_tmp)

        # Optional proxy
        if settings.YOUTUBE_PROXY:
            base_opts["proxy"] = settings.YOUTUBE_PROXY

        # ---------------------------------------------------------
        # YouTube client fallback tiers
        # ---------------------------------------------------------
        tiers = [
            {
                "name": "Primary Client + PO Token",
                "opts": {
                    **base_opts,
                    "format": "18/22/best[height<=720]/best",
                    "extractor_args": _get_pot_extractor_args(),
                },
            },

            {
                "name": "Android Mobile + PO Token",
                "opts": {
                    **base_opts,
                    "format": "18/22/best[height<=720]/best",
                    "extractor_args": _get_pot_extractor_args(
                        "android"
                    ),
                    "http_headers": {
                        "User-Agent": (
                            "com.google.android.youtube/19.09.37 "
                            "(Linux; U; Android 14; en_US; "
                            "Pixel 7 Pro Build/UQ1A.240205.004)"
                        ),
                        "Accept-Language": "en-US,en;q=0.9",
                    },
                },
            },

            {
                "name": "iOS Mobile + PO Token",
                "opts": {
                    **base_opts,
                    "format": "18/22/best[height<=720]/best",
                    "extractor_args": _get_pot_extractor_args(
                        "ios"
                    ),
                    "http_headers": {
                        "User-Agent": (
                            "com.google.ios.youtube/19.10.1 "
                            "(iPhone14,3; U; CPU iOS 17_4; "
                            "en_US)"
                        ),
                        "Accept-Language": "en-US,en;q=0.9",
                    },
                },
            },

            {
                "name": "Android Creator + PO Token",
                "opts": {
                    **base_opts,
                    "format": "18/22/best[height<=720]/best",
                    "extractor_args": _get_pot_extractor_args(
                        "android_creator"
                    ),
                },
            },
        ]

        last_error = None
        vid_id = ""

        for tier in tiers:
            try:
                logger.info(
                    f"[Downloader] Attempting download with "
                    f"{tier['name']}..."
                )

                with yt_dlp.YoutubeDL(tier["opts"]) as ydl:
                    info = ydl.extract_info(
                        url,
                        download=True
                    )

                    vid_id = info.get("id", "")
                    title = info.get(
                        "title",
                        "YouTube Video"
                    )
                    duration = int(
                        info.get("duration") or 0
                    )

                    matched_file = _find_downloaded_file(
                        output_dir,
                        vid_id,
                        temp_prefix
                    )

                    if matched_file and matched_file.exists():
                        logger.info(
                            "[Downloader] Successfully downloaded "
                            f"via {tier['name']}: "
                            f"{title} ({matched_file.name})"
                        )

                        return {
                            "title": title,
                            "duration": duration,
                            "file_path": str(
                                matched_file.resolve()
                            ),
                            "video_id": vid_id,
                        }

            except Exception as e:
                last_error = e

                logger.warning(
                    f"[Downloader] {tier['name']} "
                    f"attempt failed: {e}"
                )

                _cleanup_partial_files(
                    output_dir,
                    vid_id,
                    temp_prefix
                )

        # ---------------------------------------------------------
        # All tiers failed
        # ---------------------------------------------------------
        err_str = (
            str(last_error).lower()
            if last_error
            else ""
        )

        _cleanup_partial_files(
            output_dir,
            vid_id,
            temp_prefix
        )

        if (
            "sign in to confirm you're not a bot" in err_str
            or "sign in to confirm you’re not a bot" in err_str
            or "bot verification" in err_str
            or "http error 429" in err_str
            or "use --cookies" in err_str
            or "cookies-from-browser" in err_str
        ):
            raise RuntimeError(
                "YouTube is currently blocking automated access "
                "from the processing server. Please upload the "
                "video directly."
            )

        elif (
            "private video" in err_str
            or "video unavailable" in err_str
            or "this video has been removed" in err_str
        ):
            raise RuntimeError(
                "This YouTube video is unavailable or restricted. "
                "Please check the URL or upload the video directly."
            )

        elif "no video formats found" in err_str:
            raise RuntimeError(
                "Could not retrieve a compatible video stream "
                "for this YouTube URL. Please upload the video "
                "directly."
            )

        else:
            raise RuntimeError(
                f"YouTube download failed: {last_error}"
            )

    # Hard 90-second timeout
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_download),
            timeout=90.0
        )

    except asyncio.TimeoutError:
        logger.error(
            "[Downloader] Download timed out after 90 seconds"
        )

        raise RuntimeError(
            "YouTube video download timed out. "
            "Please try uploading the video directly."
        )


def _find_downloaded_file(
    output_dir: Path,
    vid_id: str,
    prefix: str
) -> Path:
    """Find downloaded video file matching the video ID."""

    if not vid_id:
        return None

    # Exact prefix match
    for f in output_dir.glob(
        f"{vid_id}_{prefix}.*"
    ):
        if (
            f.is_file()
            and f.suffix.lower()
            in [".mp4", ".mkv", ".webm", ".mov"]
            and not f.name.endswith(".part")
        ):
            return f

    # General video ID match
    for f in output_dir.glob(
        f"{vid_id}*"
    ):
        if (
            f.is_file()
            and f.suffix.lower()
            in [".mp4", ".mkv", ".webm", ".mov"]
            and not f.name.endswith(".part")
        ):
            return f

    return None


def _cleanup_partial_files(
    output_dir: Path,
    vid_id: str,
    prefix: str
):
    """Remove temporary/partial download files."""

    try:
        patterns = (
            [
                f"*{prefix}*",
                f"*{vid_id}*.part",
                f"*{vid_id}*.ytdl",
            ]
            if vid_id
            else [f"*{prefix}*"]
        )

        for pattern in patterns:
            for f in output_dir.glob(pattern):
                if f.is_file():
                    try:
                        f.unlink(
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
    """Save uploaded video file."""

    output_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    ext = (
        file.filename.split(".")[-1]
        if file.filename and "." in file.filename
        else "mp4"
    )

    file_id = str(uuid.uuid4())

    file_path = (
        output_dir / f"{file_id}.{ext}"
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

    await asyncio.to_thread(_save)

    return {
        "title": (
            file.filename
            or "Uploaded Video"
        ),
        "file_path": str(
            file_path.resolve()
        ),
    }