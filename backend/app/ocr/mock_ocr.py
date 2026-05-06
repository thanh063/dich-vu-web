import asyncio
from typing import List


async def process_pdf_to_latex(file_path: str) -> List[dict]:
    # Mock OCR: simulate processing delay and return sample latex
    await asyncio.sleep(1)
    return [
        {"page": 1, "latex": "E=mc^2", "confidence_score": 0.92},
        {"page": 2, "latex": "\\int_0^1 x^2 dx = 1/3", "confidence_score": 0.78},
        {"page": 1, "latex": "a^2+b^2=c^2", "confidence_score": 0.64},
        {"page": 2, "latex": "\\sum_{i=1}^{n} i = n(n+1)/2", "confidence_score": 0.86},
    ]


async def run_ocr(image_path: str) -> dict:
    # Mock OCR re-run for a single formula image.
    await asyncio.sleep(0.6)
    _ = image_path
    return {"latex": "E=mc^2", "confidence_score": 0.9}
