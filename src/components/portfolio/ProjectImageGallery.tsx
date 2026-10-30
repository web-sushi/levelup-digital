import Image from "next/image";
import {
  CLIENT_IMAGE_HEIGHT,
  CLIENT_IMAGE_WIDTH,
  type ClientImage,
} from "@/content/projects/client-work";

export function ProjectImageGallery({ images }: { images: ClientImage[] }) {
  return (
    <ul className="client-gallery">
      {images.map((image) => (
        <li key={`${image.src}-${image.caption}`}>
          <figure className="client-figure">
            <Image
              src={image.src}
              alt={image.alt}
              width={CLIENT_IMAGE_WIDTH}
              height={CLIENT_IMAGE_HEIGHT}
              sizes="(max-width: 1024px) 100vw, 72rem"
              className="client-shot"
            />
            <figcaption>{image.caption}</figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
