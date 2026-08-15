import re
from typing import List, Dict, Any


def generate_hook_variations(opening_text: str, is_hindi: bool = False) -> List[Dict[str, str]]:
    """Generate 6 category-specific viral hook variations for opening seconds."""
    # Clean opening
    cleaned_opening = re.sub(r'^[^\w]+', '', opening_text).strip()
    words = cleaned_opening.split()
    short_topic = " ".join(words[:6]) if len(words) >= 3 else "this video"
    
    if is_hindi:
        return [
            {
                "category": "Curiosity",
                "label": "Curiosity Hook",
                "text": f"Aapko yakeen nahi hoga lekin {short_topic}..."
            },
            {
                "category": "Question",
                "label": "Question Hook",
                "text": f"Kya aapne kabhi socha hai ki {short_topic} kaise kaam karta hai?"
            },
            {
                "category": "Shock",
                "label": "Shock Hook",
                "text": f"Yeh galti bilkul mat karna: {short_topic}!"
            },
            {
                "category": "Controversial",
                "label": "Controversial Hook",
                "text": f"Sab log galat hain jab baat aati hai {short_topic} ki..."
            },
            {
                "category": "Story",
                "label": "Story Hook",
                "text": f"Is ek cheez ne sab kuch badal diya..."
            },
            {
                "category": "Bold Statement",
                "label": "Bold Statement",
                "text": f"Sach suno: {short_topic} aapki soch se alag hai!"
            }
        ]

    return [
        {
            "category": "Curiosity",
            "label": "Curiosity Hook",
            "text": f"You won't believe what happens with {short_topic}..."
        },
        {
            "category": "Question",
            "label": "Question Hook",
            "text": f"Have you ever wondered why {short_topic}?"
        },
        {
            "category": "Shock",
            "label": "Shock Hook",
            "text": f"Stop making this massive mistake with {short_topic}!"
        },
        {
            "category": "Controversial",
            "label": "Controversial Hook",
            "text": f"Most experts are completely wrong about {short_topic}..."
        },
        {
            "category": "Story",
            "label": "Story Hook",
            "text": f"This one moment changed everything about {short_topic}..."
        },
        {
            "category": "Bold Statement",
            "label": "Bold Statement",
            "text": f"The brutal truth about {short_topic} no one tells you!"
        }
    ]
