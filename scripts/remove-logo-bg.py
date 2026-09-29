import os
import math
from PIL import Image

src_path = r"C:\Users\quant\.gemini\antigravity-ide\brain\bea99575-ac11-49cf-8339-ff85b9cc89ad\.user_uploaded\media_1790678113346.jpg"

img = Image.open(src_path).convert("RGBA")
pixels = img.load()
width, height = img.size

# Process each pixel to remove white background and provide anti-aliased edge
for y in range(height):
    for x in range(width):
        r, g, b, a = pixels[x, y]
        # Calculate Euclidean distance from pure white (255, 255, 255)
        dist = math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2)
        if dist <= 18:
            # Fully transparent
            pixels[x, y] = (r, g, b, 0)
        elif dist < 55:
            # Smooth feathering between 18 and 55
            factor = (dist - 18) / (55 - 18)
            new_alpha = int(factor * 255)
            pixels[x, y] = (r, g, b, new_alpha)
        else:
            pixels[x, y] = (r, g, b, 255)

# Crop transparent border padding
bbox = img.getbbox()
if bbox:
    margin = 8
    left = max(0, bbox[0] - margin)
    top = max(0, bbox[1] - margin)
    right = min(width, bbox[2] + margin)
    bottom = min(height, bbox[3] + margin)
    img = img.crop((left, top, right, bottom))

destinations = [
    r"d:\sept2026\github\CLOUD EXTRACTED\HRMS\HMRS2.0\hrms2.0-frontend-develop\src\assets\logo\Logo.png",
    r"d:\sept2026\github\CLOUD EXTRACTED\HRMS\HMRS2.0\hrms2.0-frontend-develop\src\assets\logo\Logox.png",
    r"d:\sept2026\github\CLOUD EXTRACTED\HRMS\HMRS2.0\hrms2.0-frontend-develop\src\assets\logo\logo-expand-dark.png",
    r"d:\sept2026\github\CLOUD EXTRACTED\HRMS\HMRS2.0\hrms2.0-frontend-develop\src\assets\logo\logo-expand-light.png",
    r"d:\sept2026\github\CLOUD EXTRACTED\HRMS\HMRS2.0\hrms2.0-frontend-develop\public\logo.png",
]

for dest in destinations:
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    img.save(dest, format="PNG")
    print(f"Saved transparent logo: {dest}")

print("All logos successfully converted to transparent PNG!")
