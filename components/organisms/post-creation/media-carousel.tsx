import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/atoms/button";
import { ChevronLeft, ChevronRight, X, Play, Pause } from "lucide-react";

interface MediaCarouselProps {
	media: any[];
	onRemove?: (index: number) => void;
	showDeleteButton?: boolean;
}

export const MediaCarousel = ({ media, onRemove, showDeleteButton = false }: MediaCarouselProps) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [tempUploads, setTempUploads] = useState<any[]>([]);
	const [isAnimating, setIsAnimating] = useState(false);
	const [touchStart, setTouchStart] = useState<number | null>(null);
	const [touchEnd, setTouchEnd] = useState<number | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Load temporary uploads from localStorage
	useEffect(() => {
		const uploads = JSON.parse(localStorage.getItem('temp_uploads') || '[]');
		setTempUploads(uploads);
	}, []);

	// Combine regular media with temporary uploads
	const allMedia = useMemo(() => [...(media || []), ...tempUploads], [media, tempUploads]);

	const handlePrev = () => {
		if (isAnimating) return;
		setIsAnimating(true);
		setCurrentIndex((prevIndex) => (prevIndex === 0 ? allMedia.length - 1 : prevIndex - 1));
		setTimeout(() => setIsAnimating(false), 300);
	};

	const handleNext = () => {
		if (isAnimating) return;
		setIsAnimating(true);
		setCurrentIndex((prevIndex) => (prevIndex === allMedia.length - 1 ? 0 : prevIndex + 1));
		setTimeout(() => setIsAnimating(false), 300);
	};

	const handleRemove = (index: number) => {
		if (onRemove) {
			onRemove(index);
		}
		// Adjust current index if needed
		if (currentIndex >= allMedia.length - 1) {
			setCurrentIndex(Math.max(0, allMedia.length - 2));
		}
	};

	const handleGoToSlide = (index: number) => {
		if (isAnimating || index === currentIndex) return;
		setIsAnimating(true);
		setCurrentIndex(index);
		setTimeout(() => setIsAnimating(false), 300);
	};

	// Touch handlers
	const handleTouchStart = (e: React.TouchEvent) => {
		setTouchEnd(null);
		setTouchStart(e.targetTouches[0].clientX);
	};

	const handleTouchMove = (e: React.TouchEvent) => {
		setTouchEnd(e.targetTouches[0].clientX);
	};

	const handleTouchEnd = () => {
		if (!touchStart || !touchEnd) return;
		
		const distance = touchStart - touchEnd;
		const minSwipeDistance = 50;

		if (distance > minSwipeDistance) {
			handleNext();
		} else if (distance < -minSwipeDistance) {
			handlePrev();
		}
	};

	// Keyboard navigation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'ArrowLeft') handlePrev();
			if (e.key === 'ArrowRight') handleNext();
		};

		if (containerRef.current) {
			containerRef.current.addEventListener('keydown', handleKeyDown);
		}

		return () => {
			if (containerRef.current) {
				containerRef.current.removeEventListener('keydown', handleKeyDown);
			}
		};
	}, []);

	if (!allMedia || allMedia.length === 0) return null;

	return (
		<div 
			ref={containerRef}
			className="relative max-w-2xl mx-auto group"
			tabIndex={0}
			role="region"
			aria-label="Media carousel"
		>
			{/* Main carousel container */}
			<div className="relative overflow-hidden rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
				<div
					className="flex transition-transform duration-300 ease-out"
					style={{ transform: `translateX(-${currentIndex * 100}%)` }}
					onTouchStart={handleTouchStart}
					onTouchMove={handleTouchMove}
					onTouchEnd={handleTouchEnd}
				>
					{allMedia.map((mediaItem, index) => (
						<div key={index} className="flex-shrink-0 w-full relative">
							<MediaComponent 
								mediaItem={mediaItem} 
								onRemove={onRemove} 
								showDeleteButton={showDeleteButton} 
								index={index} 
							/>
						</div>
					))}
				</div>

				{/* Navigation arrows */}
				{allMedia.length > 1 && (
					<>
						<Button
							variant="soft"
							size="1"
							onClick={handlePrev}
							className="absolute top-1/2 left-3 transform -translate-y-1/2 !rounded-full !w-10 !h-10 bg-card/20 hover:bg-card/30 text-white shadow-lg backdrop-blur-md border border-white/20 transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100"
							aria-label="Previous image"
						>
							<ChevronLeft className="w-5 h-5" />
						</Button>
						<Button
							variant="soft"
							size="1"
							onClick={handleNext}
							className="absolute top-1/2 right-3 transform -translate-y-1/2 !rounded-full !w-10 !h-10 bg-card/20 hover:bg-card/30 text-white shadow-lg backdrop-blur-md border border-white/20 transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100"
							aria-label="Next image"
						>
							<ChevronRight className="w-5 h-5" />
						</Button>
					</>
				)}

				{/* Progress bar */}
				{allMedia.length > 1 && (
					<div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
						<div 
							className="h-full bg-lime-500 transition-all duration-300 ease-out"
							style={{ width: `${((currentIndex + 1) / allMedia.length) * 100}%` }}
						/>
					</div>
				)}
			</div>

			{/* Indicators */}
			{allMedia.length > 1 && (
				<div className="flex justify-center gap-2 mt-4">
					{allMedia.map((_, index) => (
						<button
							key={index}
							onClick={() => handleGoToSlide(index)}
							className={`relative w-3 h-3 rounded-full transition-all duration-300 ${
								currentIndex === index 
									? 'bg-lime-500 shadow-lg shadow-lime-500/50 scale-125' 
									: 'bg-muted-foreground/30 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-8000'
							}`}
							aria-label={`Go to slide ${index + 1}`}
						>
							{currentIndex === index && (
								<div className="absolute inset-0 rounded-full bg-lime-500 animate-ping" />
							)}
						</button>
					))}
				</div>
			)}

			{/* Media counter */}
			{allMedia.length > 1 && (
				<div className="absolute top-3 left-3 px-2 py-1 bg-black/60 text-white text-xs rounded-full backdrop-blur-sm">
					{currentIndex + 1} / {allMedia.length}
				</div>
			)}
		</div>
	);
};

const MediaComponent = ({ mediaItem, onRemove, showDeleteButton = false, index }: { 
	mediaItem: any; 
	onRemove?: (index: number) => void; 
	showDeleteButton?: boolean;
	index?: number;
}) => {
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [isPlaying, setIsPlaying] = useState(false);
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		if (!mediaItem) return;

		const loadMediaUrl = async () => {
			setLoading(true);
			setError(false);
			
			// Debug the media item structure
			console.log('🔍 Media item debug:', {
				type: mediaItem.type,
				hasImage: !!mediaItem.image,
				hasVideo: !!mediaItem.video,
				hasUrl: !!mediaItem.url,
				fullItem: mediaItem
			});
			
			try {
				let url = null;
				
				// ✅ Handle different media structures
				if (mediaItem.type === "image" || mediaItem.type === "url-image") {
					if (mediaItem.type === "url-image" && mediaItem.url) {
						// API post with direct URL - validate URL first
						if (typeof mediaItem.url === 'string' && mediaItem.url.startsWith('http')) {
							url = mediaItem.url;
						} else {
							console.error('❌ Invalid URL for url-image:', mediaItem.url);
						}
					} else if (mediaItem.image) {
						// Jazz FileStream structure
						url = await extractMediaUrl(mediaItem.image);
					} else if (mediaItem.url) {
						// Fallback for other URL structures
						url = await extractMediaUrl(mediaItem.url);
					} else if (mediaItem) {
						// Try the media item itself
						url = await extractMediaUrl(mediaItem);
					}
				} else if (mediaItem.type === "video" || mediaItem.type === "url-video") {
					if (mediaItem.type === "url-video" && mediaItem.url) {
						// API post with direct URL - validate URL first
						if (typeof mediaItem.url === 'string' && mediaItem.url.startsWith('http')) {
							url = mediaItem.url;
						} else {
							console.error('❌ Invalid URL for url-video:', mediaItem.url);
						}
					} else if (mediaItem.video) {
						// Jazz FileStream structure
						url = await extractMediaUrl(mediaItem.video);
					} else if (mediaItem.url) {
						// Fallback for other URL structures
						url = await extractMediaUrl(mediaItem.url);
					} else if (mediaItem) {
						// Try the media item itself
						url = await extractMediaUrl(mediaItem);
					}
				}
				
				if (url) {
					setImageUrl(url);
				} else {
					console.warn('⚠️ Could not extract media URL from:', mediaItem);
					setError(true);
				}
			} catch (err) {
				console.error('❌ Error loading media:', err);
				setError(true);
			} finally {
				setLoading(false);
			}
		};

		loadMediaUrl();
	}, [mediaItem]);

	const toggleVideoPlayback = () => {
		if (videoRef.current) {
			if (isPlaying) {
				videoRef.current.pause();
			} else {
				videoRef.current.play();
			}
			setIsPlaying(!isPlaying);
		}
	};

	if (!mediaItem) return null;

	return (
		<div className="relative w-full h-[500px] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
			{(() => {
				if (loading) {
					return (
						<div className="w-full h-full flex items-center justify-center">
							<div className="text-center">
								<div className="w-12 h-12 border-4 border-lime-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
								<p className="text-muted-foreground text-sm font-medium">Loading media...</p>
								<div className="mt-2 w-24 h-1 bg-muted-foreground/30 dark:bg-gray-600 rounded-full overflow-hidden">
									<div className="h-full bg-lime-500 rounded-full animate-pulse" style={{ width: '60%' }} />
								</div>
							</div>
						</div>
					);
				}

				if (error || !imageUrl) {
					return (
						<div className="w-full h-full flex items-center justify-center">
							<div className="text-center p-8">
								<div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4 mx-auto">
									<X className="w-8 h-8 text-red-500" />
								</div>
								<p className="text-muted-foreground font-medium">Failed to load media</p>
								<p className="text-xs text-muted-foreground dark:text-muted-foreground mt-2">
									{(mediaItem?.type === 'image' || mediaItem?.type === 'url-image') ? 'Image' : 'Video'} unavailable
								</p>

							</div>
						</div>
					);
				}

				if (mediaItem.type === "image" || mediaItem.type === "url-image") {
					console.log('✅ Rendering image with type:', mediaItem.type);
					return (
						<div className="relative w-full h-full group">
							<Image
								src={imageUrl}
								alt={mediaItem.alt?.toString?.() || mediaItem.alt || "uploaded image"}
								fill
								sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
								className="object-cover transition-transform duration-300 hover:scale-105"
								onError={() => setError(true)}
								priority
							/>
							{/* Delete button */}
							{showDeleteButton && onRemove && typeof index === 'number' && (
								<button
									onClick={() => onRemove(index)}
									className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center shadow-lg"
									aria-label="Remove image"
								>
									<X className="w-4 h-4" />
								</button>
							)}
						</div>
					);
				} else if (mediaItem.type === "video" || mediaItem.type === "url-video") {
					console.log('✅ Rendering video with type:', mediaItem.type);
					return (
						<div className="relative w-full h-full group">
							<video
								ref={videoRef}
								src={imageUrl}
								className="w-full h-full object-cover"
								onError={() => setError(true)}
								onPlay={() => setIsPlaying(true)}
								onPause={() => setIsPlaying(false)}
								loop
								muted
							/>
							{/* Video controls overlay */}
							<div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200">
								<Button
									variant="soft"
									size="2"
									onClick={toggleVideoPlayback}
									className="!rounded-full !w-16 !h-16 bg-card/20 hover:bg-card/30 text-white backdrop-blur-md border border-white/20"
								>
									{isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
								</Button>
							</div>
							{/* Delete button */}
							{showDeleteButton && onRemove && typeof index === 'number' && (
								<button
									onClick={() => onRemove(index)}
									className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center shadow-lg z-10"
									aria-label="Remove video"
								>
									<X className="w-4 h-4" />
								</button>
							)}
							{/* Video overlay gradient */}
							<div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
						</div>
					);
				}

				console.error('❌ Unsupported media type detected:', {
					type: mediaItem?.type,
					expectedTypes: ['image', 'url-image', 'video', 'url-video'],
					mediaItem: mediaItem
				});
				
				return (
					<div className="w-full h-full flex items-center justify-center">
						<div className="text-center p-8">
							<div className="w-16 h-16 bg-muted dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 mx-auto">
								<X className="w-8 h-8 text-muted-foreground" />
							</div>
							<p className="text-muted-foreground font-medium">Unsupported media type</p>
							<p className="text-xs text-muted-foreground dark:text-muted-foreground mt-2">Type: {mediaItem?.type || 'unknown'}</p>
							<p className="text-xs text-red-500 mt-1">Check console for debug info</p>
						</div>
					</div>
				);
			})()}
		</div>
	);
};

// Helper function to extract media URL from FileStream or direct URL
const extractMediaUrl = async (media: any): Promise<string | null> => {
	if (!media) return null;

	try {
		// ✅ FIRST: Check if it's already a direct URL string (for API posts)
		if (typeof media === 'string') {
			if (media.startsWith('http') || media.startsWith('https') || media.startsWith('data:') || media.startsWith('blob:')) {
				return media;
			}
		}

		// ✅ SECOND: Check if it's a URL-based media object (for API posts)
		if (typeof media === 'object' && media.url) {
			if (typeof media.url === 'string' && (media.url.startsWith('http') || media.url.startsWith('https') || media.url.startsWith('data:') || media.url.startsWith('blob:'))) {
				return media.url;
			}
		}

		// ✅ THIRD: Check if it's a Jazz URL media type (url-image, url-video)
		if (typeof media === 'object' && (media.type === 'url-image' || media.type === 'url-video')) {
			if (typeof media.url === 'string') {
				return media.url;
			}
		}

		// ✅ THIRD: Handle Jazz FileStream objects (for UI uploads)
		const fileStream = media;
		
		// Try different methods to get the URL from FileStream
		if (typeof fileStream.createObjectURL === 'function') {
			return fileStream.createObjectURL();
		}
		
		if (typeof fileStream.getBlob === 'function') {
			const blob = await fileStream.getBlob();
			if (blob) return URL.createObjectURL(blob);
		}
		
		if (typeof fileStream.toBlob === 'function') {
			const blob = await fileStream.toBlob();
			if (blob) return URL.createObjectURL(blob);
		}
		
		if (typeof fileStream.asBlob === 'function') {
			const blob = await fileStream.asBlob();
			if (blob) return URL.createObjectURL(blob);
		}
		
		if (typeof fileStream.getBlobURL === 'function') {
			return await fileStream.getBlobURL();
		}
		
		// Try accessing raw data
		if (fileStream._raw && (fileStream._raw.blob || fileStream._raw.data)) {
			const blob = fileStream._raw.blob || fileStream._raw.data;
			if (blob instanceof Blob) {
				return URL.createObjectURL(blob);
			}
		}
		
		// Check if toString returns a valid URL
		if (fileStream.toString && typeof fileStream.toString === 'function') {
			const stringValue = fileStream.toString();
			if (stringValue.startsWith('blob:') || stringValue.startsWith('data:') || stringValue.startsWith('http')) {
				return stringValue;
			}
		}
		
		return null;
	} catch (error) {
		console.error('❌ Error extracting media URL:', error);
		return null;
	}
}; 