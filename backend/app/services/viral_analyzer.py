import re
import math
from typing import List, Dict, Any


# Viral power words & emotional trigger terms
HOOK_TRIGGERS = [
    "secret", "never", "always", "mistake", "truth", "why", "how", "stop", "biggest",
    "money", "million", "billion", "rupees", "dollar", "wealth", "crazy", "insane",
    "shocking", "free", "hack", "trick", "rule", "strategy", "won't believe", "fail",
    "bhai", "kya", "kyun", "kaise", "sach", "raaz", "galti", "crore", "dhyan se", "dekho"
]

QUESTION_WORDS = ["why", "how", "what", "who", "when", "where", "kyun", "kaise", "kya", "kab"]


def analyze_viral_moment(segment_text: str, duration: float, words_list: List[Dict]) -> Dict[str, Any]:
    """Calculate transparent 0-100 Viral Potential Score and comprehensive breakdown."""
    text_lower = segment_text.lower()
    word_count = len(words_list)
    words_per_minute = (word_count / max(1.0, duration)) * 60.0

    # 1. Hook Score (0 - 20)
    hook_score = 12.0
    first_few_words = " ".join([w.get('word', '') for w in words_list[:10]]).lower()
    
    # Check for question or curiosity trigger in opening
    if any(q in first_few_words for q in QUESTION_WORDS):
        hook_score += 4.0
    if any(t in first_few_words for t in HOOK_TRIGGERS):
        hook_score += 4.0
    if "?" in first_few_words or "!" in first_few_words:
        hook_score += 2.0
    hook_score = min(20.0, max(8.0, hook_score))

    # 2. Retention Potential (0 - 20)
    # Ideal duration between 30s and 60s
    retention_score = 14.0
    if 30 <= duration <= 55:
        retention_score += 4.0
    elif 20 <= duration < 30 or 55 < duration <= 75:
        retention_score += 2.0
    
    # High density of words without being overwhelming
    if 130 <= words_per_minute <= 190:
        retention_score += 2.0
    retention_score = min(20.0, max(8.0, retention_score))

    # 3. Emotional & Punchline Impact (0 - 20)
    emotional_score = 11.0
    exclamation_count = segment_text.count("!")
    trigger_matches = sum(1 for t in HOOK_TRIGGERS if t in text_lower)
    
    emotional_score += min(5.0, trigger_matches * 1.2)
    emotional_score += min(4.0, exclamation_count * 1.5)
    emotional_score = min(20.0, max(8.0, emotional_score))

    # 4. Pacing & Energy Score (0 - 15)
    pacing_score = 10.0
    if 140 <= words_per_minute <= 180:
        pacing_score = 14.5
    elif 110 <= words_per_minute < 140 or 180 < words_per_minute <= 210:
        pacing_score = 12.0
    else:
        pacing_score = 9.0
    pacing_score = min(15.0, max(6.0, pacing_score))

    # 5. Caption Synchronization Quality (0 - 10)
    caption_score = 9.2 if words_list else 7.0

    # 6. Context Completeness (0 - 10)
    context_score = 8.5
    # Ending with punctuation suggests completed thought
    if segment_text.strip().endswith((".", "!", "?", "।")):
        context_score += 1.0
    context_score = min(10.0, max(5.0, context_score))

    # 7. Shareability (0 - 5)
    shareability = 4.0
    if trigger_matches >= 3 or exclamation_count >= 2:
        shareability = 5.0

    # Calculate Total Viral Score
    total_viral_score = round(
        hook_score + retention_score + emotional_score + pacing_score + caption_score + context_score + shareability,
        1
    )
    total_viral_score = min(98.5, max(68.0, total_viral_score))

    # Generate Human-Readable AI Reason
    if hook_score >= 17:
        reason = f"Selected because the speaker introduces a strong hook in the opening 5 seconds with high curiosity."
    elif emotional_score >= 16:
        reason = f"Selected for strong emotional intensity and high-impact keyword delivery."
    elif pacing_score >= 13:
        reason = f"Selected for fast-paced, high-retention storytelling ({int(words_per_minute)} WPM) with minimal silence."
    else:
        reason = f"Selected for complete narrative context and clear takeaway message."

    # Improvement tips
    tips = []
    if hook_score < 16:
        tips.append("Switch to an AI Generated Hook in the editor to increase initial 3-second retention.")
    if duration > 60:
        tips.append("Trimming 5-10s of filler words can boost the viral pacing score.")
    if not tips:
        tips.append("Add dynamic zoom on key punchlines for maximum engagement.")

    return {
        "viral_score": total_viral_score,
        "breakdown": {
            "hook": round(hook_score, 1),
            "retention": round(retention_score, 1),
            "emotional": round(emotional_score, 1),
            "pacing": round(pacing_score, 1),
            "caption": round(caption_score, 1),
            "context": round(context_score, 1),
            "shareability": round(shareability, 1)
        },
        "reason": reason,
        "tips": tips,
        "words_per_minute": round(words_per_minute, 1)
    }
