import zlib
import struct
import math

def create_png(width, height, get_pixel_func):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter byte: none
        for x in range(width):
            r, g, b, a = get_pixel_func(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    # PNG signature
    png = bytearray(b'\x89PNG\r\n\x1a\n')
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    png.extend(struct.pack('>I', len(ihdr_data)))
    png.extend(b'IHDR')
    png.extend(ihdr_data)
    png.extend(struct.pack('>I', ihdr_crc))
    
    # IDAT chunk
    compressed = zlib.compress(raw_data, 9)
    idat_crc = zlib.crc32(b'IDAT' + compressed)
    png.extend(struct.pack('>I', len(compressed)))
    png.extend(b'IDAT')
    png.extend(compressed)
    png.extend(struct.pack('>I', idat_crc))
    
    # IEND chunk
    iend_crc = zlib.crc32(b'IEND')
    png.extend(struct.pack('>I', 0))
    png.extend(b'IEND')
    png.extend(struct.pack('>I', iend_crc))
    
    return bytes(png)

def app_icon_pixel(x, y, w, h):
    # Normalized coordinates -1 to 1
    nx = (x / w) * 2 - 1
    ny = (y / h) * 2 - 1
    dist = math.sqrt(nx * nx + ny * ny)
    
    # Rounded rectangle background
    corner_radius = 0.8
    # Smooth deep indigo to sapphire gradient
    grad_t = (x + y) / (w + h)
    bg_r = int(24 + grad_t * 30)
    bg_g = int(32 + grad_t * 60)
    bg_b = int(72 + grad_t * 160)
    
    # Outer squircle mask (iOS style rounded corner)
    # squircle equation |x|^4 + |y|^4 <= 0.85
    p = 4.0
    s_dist = (abs(nx)**p + abs(ny)**p)**(1/p)
    if s_dist > 0.96:
        return (0, 0, 0, 0) # transparent outer
    
    # Subtle inner glow / border
    if s_dist > 0.90:
        factor = (s_dist - 0.90) / 0.06
        bg_r = int(bg_r * (1 - factor) + 90 * factor)
        bg_g = int(bg_g * (1 - factor) + 140 * factor)
        bg_b = int(bg_b * (1 - factor) + 255 * factor)

    # Let's draw 3 vertical stripes or 3 decorative concentric arcs for EN, RO, RU
    # Center emblem: cards motif
    cx = nx * 100
    cy = ny * 100
    
    # Central card 1 (main white card)
    if -38 <= cx <= 38 and -48 <= cy <= 48:
        # Rounded card
        cr = 10
        dx = max(0, abs(cx) - (38 - cr))
        dy = max(0, abs(cy) - (48 - cr))
        if math.sqrt(dx*dx + dy*dy) <= cr:
            # Inside main card: 3 colored horizontal stripes (symbolizing 3 languages)
            if -30 <= cy <= -10:
                # English Royal Navy Blue with Red accent
                return (30, 64, 175, 255)
            elif -6 <= cy <= 14:
                # Romanian Yellow/Gold
                return (234, 179, 8, 255)
            elif 18 <= cy <= 38:
                # Russian/Trio Ruby Red
                return (225, 29, 72, 255)
            else:
                return (255, 255, 255, 255)

    return (bg_r, bg_g, bg_b, 255)

for size, name in [(180, 'apple-touch-icon.png'), (192, 'icon-192.png'), (512, 'icon-512.png')]:
    data = create_png(size, size, app_icon_pixel)
    with open(f'/Users/mac/.gemini/antigravity/scratch/lingua-trio-pwa/icons/{name}', 'wb') as f:
        f.write(data)

print("Icons generated successfully!")
