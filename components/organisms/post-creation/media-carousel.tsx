import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Button } from "@radix-ui/themes";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface MediaCarouselProps {
	media: any[];
	onRemove?: (index: number) => void;
	showDeleteButton?: boolean;
}

export const MediaCarousel = ({ media, onRemove, showDeleteButton = false }: MediaCarouselProps) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [tempUploads, setTempUploads] = useState<any[]>([]);

	// Load temporary uploads from localStorage
	useEffect(() => {
		const uploads = JSON.parse(localStorage.getItem('temp_uploads') || '[]');
		setTempUploads(uploads);
	}, []);

	// Combine regular media with temporary uploads
	const allMedia = useMemo(() => [...(media || []), ...tempUploads], [media, tempUploads]);

	const handlePrev = () => {
		setCurrentIndex((prevIndex) => (prevIndex === 0 ? allMedia.length - 1 : prevIndex - 1));
	};

	const handleNext = () => {
		setCurrentIndex((prevIndex) => (prevIndex === allMedia.length - 1 ? 0 : prevIndex + 1));
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

	if (!allMedia || allMedia.length === 0) return null;

	return (
		<div className="relative max-w-lg mx-auto">
			<div className="overflow-hidden rounded-lg shadow-md">
				<div
					className="flex transition-transform duration-300 ease-in-out"
					style={{ transform: `translateX(-${currentIndex * 100}%)` }}
				>
					{allMedia.map((mediaItem, index) => (
						<div key={index} className="flex-shrink-0 w-full relative">
							<MediaComponent mediaItem={mediaItem} />
							{showDeleteButton && (
								<Button
									variant="soft"
									size="1"
									onClick={() => handleRemove(index)}
									className="absolute top-2 right-2 !rounded-full !w-8 !h-8 bg-red-500 hover:bg-red-600 text-white shadow-lg"
								>
									<X className="w-4 h-4" />
								</Button>
							)}
						</div>
					))}
				</div>
			</div>

			{allMedia.length > 1 && (
				<>
					<Button
						variant="soft"
						size="1"
						onClick={handlePrev}
						className="absolute top-1/2 left-2 transform -translate-y-1/2 !rounded-full !w-8 !h-8 bg-black/20 hover:bg-black/40 text-white"
					>
						<ChevronLeft className="w-4 h-4" />
					</Button>
					<Button
						variant="soft"
						size="1"
						onClick={handleNext}
						className="absolute top-1/2 right-2 transform -translate-y-1/2 !rounded-full !w-8 !h-8 bg-black/20 hover:bg-black/40 text-white"
					>
						<ChevronRight className="w-4 h-4" />
					</Button>
					<div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
						{allMedia.map((_, index) => (
							<button
								key={index}
								onClick={() => setCurrentIndex(index)}
								className={`w-2 h-2 rounded-full transition-colors ${
									currentIndex === index ? 'bg-white' : 'bg-white/50'
								}`}
							/>
						))}
					</div>
				</>
			)}
		</div>
	);
};

const MediaComponent = ({ mediaItem }: { mediaItem: any }) => {
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	useEffect(() => {
		if (!mediaItem) return;

		const loadMediaUrl = async () => {
			setLoading(true);
			setError(false);
			
			try {
				let url = null;
				
				if (mediaItem.type === "image" && mediaItem.image) {
					url = await extractMediaUrl(mediaItem.image);
				} else if (mediaItem.type === "video" && mediaItem.video) {
					url = await extractMediaUrl(mediaItem.video);
				}
				
				if (url) {
					setImageUrl(url);
				} else {
					setError(true);
				}
			} catch (err) {
				setError(true);
			} finally {
				setLoading(false);
			}
		};

		loadMediaUrl();
	}, [mediaItem]);

	if (!mediaItem) return null;

	return (
		<div className="max-w-lg mx-auto">
			{(() => {
				if (loading) {
					return (
						<div className="w-full h-[400px] bg-gray-100 rounded-lg shadow-md flex items-center justify-center">
							<div className="text-center">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
								<p className="text-gray-500 text-sm">Loading media...</p>
							</div>
						</div>
					);
				}

				if (error || !imageUrl) {
					return (
						<div className="w-full h-[400px] bg-gray-100 rounded-lg shadow-md flex items-center justify-center">
							<div className="text-center">
								<p className="text-gray-400">Failed to load media</p>
								<p className="text-xs text-gray-300 mt-1">
									{mediaItem?.type === 'image' ? 'Image' : 'Video'} unavailable
								</p>
							</div>
						</div>
					);
				}

				if (mediaItem.type === "image") {
					return (
						<div className="relative w-full h-[400px]">
							<Image
								src={imageUrl}
								alt={mediaItem.alt?.toString() || "uploaded image"}
								fill
								sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
								className="rounded-lg shadow-md object-cover"
								onError={() => setError(true)}
								priority
							/>
						</div>
					);
				} else if (mediaItem.type === "video") {
					return (
						<video
							src={imageUrl}
							controls
							className="w-full max-w-lg rounded-lg shadow-md"
							onError={() => setError(true)}
						/>
					);
				}

				return (
					<div className="w-full h-[400px] bg-gray-100 rounded-lg shadow-md flex items-center justify-center">
						<div className="text-center">
							<p className="text-gray-400">Unsupported media type</p>
							<p className="text-xs text-gray-300 mt-1">Type: {mediaItem?.type || 'unknown'}</p>
						</div>
					</div>
				);
			})()}
		</div>
	);
};

// Helper function to extract media URL from FileStream
const extractMediaUrl = async (fileStream: any): Promise<string | null> => {
	if (!fileStream) return null;

	try {
		// Try different methods to get the URL
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
		return null;
	}
}; 