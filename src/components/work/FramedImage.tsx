import Image from "next/image";
import type { ImageFrameKind } from "@/lib/content/schema";

/**
 * A product image inside its CSS-only device chrome (`.frame-*` in
 * globals.css). No image dimensions are stored in content, so each frame
 * carries a nominal intrinsic ratio: it reserves space before load, and the
 * `.frame-* > img { height: auto }` rules let the true ratio take over after.
 * The phone frame is the exception — its aspect is fixed and the image covers.
 */
const INTRINSIC: Record<ImageFrameKind, { w: number; h: number }> = {
  browser: { w: 1600, h: 1000 },
  tablet: { w: 1600, h: 1200 },
  phone: { w: 900, h: 1950 },
  none: { w: 1600, h: 1000 },
};

export default function FramedImage({
  src,
  alt,
  frame,
  sizes,
  className = "",
}: {
  src: string;
  alt: string;
  frame: ImageFrameKind;
  /** Real `sizes` for the column the image sits in (design-system §4). */
  sizes: string;
  className?: string;
}) {
  const { w, h } = INTRINSIC[frame];
  const img = (
    <Image
      src={src}
      alt={alt}
      width={w}
      height={h}
      sizes={sizes}
      loading="lazy"
      className={frame === "none" ? `block h-auto w-full ${className}` : undefined}
    />
  );
  if (frame === "none") return img;
  return <div className={`frame-${frame} ${className}`}>{img}</div>;
}
