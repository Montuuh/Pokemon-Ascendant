import { useState, type CSSProperties, type ImgHTMLAttributes } from 'react';

interface Props extends Pick<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'onError'> {
  width: number;
  height: number;
  imgClassName?: string;
}

/** D9 — keep the layout cell; fit the actual source pixels at whole or half steps inside it. */
export function PixelSprite({ src, alt, width, height, imgClassName, onError }: Props) {
  const [loaded, setLoaded] = useState<{ src: string | undefined; width: number; height: number }>();
  const natural = loaded?.src === src ? loaded : undefined;
  const scale = natural ? Math.max(0.5, Math.floor(Math.min(width / natural.width, height / natural.height) * 2) / 2) : undefined;
  const imageStyle: CSSProperties = {
    display: 'block', flex: 'none', maxWidth: 'none', objectFit: 'contain', imageRendering: 'pixelated',
    // A loading image keeps its cell and accessible name; never hide it while waiting for onLoad.
    width: natural ? natural.width * scale! : undefined,
    height: natural ? natural.height * scale! : undefined,
  };
  return (
    <span data-pixel-sprite style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width, height, flex: 'none' }}>
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={imgClassName}
        style={imageStyle}
        draggable={false}
        onError={onError}
        onLoad={(event) => setLoaded({ src, width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
      />
    </span>
  );
}
