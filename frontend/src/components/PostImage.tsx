import { Post } from '@/sharedDataModel';
import { ProgressiveImg } from 'jazz-react';
// import { CheckIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function PostImage({ post, idx }: { post: Post; idx?: number }) {
  const [visible, setVisible] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // const isDraftOrScheduled =
  //   post.instagram?.state === 'notScheduled' ||
  //   post.instagram?.state === 'scheduleDesired' ||
  //   post.instagram?.state === 'scheduled';

  // use intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0,
      }
    );

    observer.observe(containerRef.current!);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className={'w-full h-full relative'}>
      {/* {isDraftOrScheduled && (
        // we're not actually rendering the image in full res, but make sure it is loaded
        <ProgressiveImg
          image={post.images?.[idx || 0]?.imageFile}
          maxWidth={undefined}
        >
          {({ res, originalSize }) =>
            res && res === originalSize?.join('x') ? (
              <>
                <CheckIcon className="absolute bottom-1.5 right-2 text-black" />
                <CheckIcon className="absolute bottom-2 right-2 text-white" />
              </>
            ) : undefined
          }
        </ProgressiveImg>
      )} */}
      <ProgressiveImg
        image={post.images?.[idx || 0]?.imageFile}
        maxWidth={visible ? 1024 : 0}
      >
        {({ src }) =>
          src ? (
            <img
              className="block w-full h-full object-cover shrink-0 outline-none hover:opacity-100"
              src={src}
            />
          ) : (
            <div className="block w-full h-full bg-stone-800" />
          )
        }
      </ProgressiveImg>
    </div>
  );
}
