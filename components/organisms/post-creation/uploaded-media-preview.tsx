import { useState, useEffect, useRef } from "react";
import Image from "next/image";
// import { Button } from "@radix-ui/themes";
import { Button } from "@/components/atoms/button";
import { ChevronLeft, ChevronRight, X, Trash2, Plus, RotateCcw } from "lucide-react";

interface UploadedMediaPreviewProps {
	post: any; // Using any for now to avoid complex type issues
	activeTab: string;
	handleImageUpload?: () => void;
}

export const UploadedMediaPreview = ({ post, activeTab, handleImageUpload }: UploadedMediaPreviewProps) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	
	// Handle media removal
	const handleRemoveMedia = (indexToRemove: number) => {
		const variant = post.variants[activeTab];
		if (variant?.media && indexToRemove >= 0 && indexToRemove < variant.media.length) {
			// Remove the item from the Jazz collaborative list
			variant.media.splice(indexToRemove, 1);
			
			// Adjust current index if needed
			if (currentIndex >= variant.media.length && variant.media.length > 0) {
				setCurrentIndex(variant.media.length - 1);
			} else if (variant.media.length === 0) {
				setCurrentIndex(0);
			}
		}
	};
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [touchStart, setTouchStart] = useState<number | null>(null);
	const [touchEnd, setTouchEnd] = useState<number | null>(null);
	
	// Get media from any variant that has it - prioritize active tab, then base, then any other variant
	let media = null;
	
	if (post.variants[activeTab]?.media && Array.from(post.variants[activeTab].media).length > 0) {
		media = post.variants[activeTab].media;
	} else if (post.variants.base?.media && Array.from(post.variants.base.media).length > 0) {
		media = post.variants.base.media;
	} else {
		// Check all other variants for media
		for (const variantKey of Object.keys(post.variants || {})) {
			if (post.variants[variantKey]?.media && Array.from(post.variants[variantKey].media).length > 0) {
				media = post.variants[variantKey].media;
				break;
			}
		}
	}
	
	const mediaArray = media ? Array.from(media) : [];

	const handleDeleteClick = (index: number, e: React.MouseEvent) => {
		e.stopPropagation();
		setDeleteIndex(index);
		setShowDeleteConfirm(true);
	};

	const confirmDelete = async () => {
		if (deleteIndex !== null) {
			setIsDeleting(true);
			try {
				const mediaToRemove = mediaArray[deleteIndex];
				if (mediaToRemove && media) {
					// Remove from Jazz collaborative list
					const mediaIndex = media.findIndex((item: any) => item === mediaToRemove);
					if (mediaIndex !== -1) {
						media.splice(mediaIndex, 1);
					}
					
					// Adjust current index if needed
					if (currentIndex >= mediaArray.length - 1) {
						setCurrentIndex(Math.max(0, mediaArray.length - 2));
					}
				}
			} catch (error) {
				console.error('Error deleting media:', error);
			} finally {
				setIsDeleting(false);
				setShowDeleteConfirm(false);
				setDeleteIndex(null);
			}
		}
	};

	const cancelDelete = () => {
		setShowDeleteConfirm(false);
		setDeleteIndex(null);
	};

	const handlePrev = () => {
		setCurrentIndex((prevIndex) => (prevIndex === 0 ? mediaArray.length - 1 : prevIndex - 1));
	};

	const handleNext = () => {
		setCurrentIndex((prevIndex) => (prevIndex === mediaArray.length - 1 ? 0 : prevIndex + 1));
	};

	// Touch handlers for mobile swipe
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

	if (mediaArray.length === 0) return null;

	return (
		<>
			<div className="relative group max-w-2xl mx-auto">
				<div 
					className="relative overflow-hidden rounded-lg bg-muted dark:bg-muted"
					onTouchStart={handleTouchStart}
					onTouchMove={handleTouchMove}
					onTouchEnd={handleTouchEnd}
				>
					{/* Image counter badge */}
					{mediaArray.length > 1 && (
						<div className="absolute top-3 left-3 z-20 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded-full">
							{currentIndex + 1} / {mediaArray.length}
						</div>
					)}

					<div
						className="flex transition-transform duration-300 ease-out"
						style={{ transform: `translateX(-${currentIndex * 100}%)` }}
					>
						{mediaArray.map((mediaItem, index) => (
							<div key={index} className="w-full flex-shrink-0 relative group">
								<div className="aspect-video relative bg-muted dark:bg-muted">
									{/* Remove button */}
									<button
										onClick={() => handleRemoveMedia(index)}
										className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center shadow-lg z-10"
										aria-label="Remove media"
									>
										<X className="w-4 h-4" />
									</button>
									
									{/* Handle different media types - both uploaded and URL-based */}
									{((mediaItem as any)?.type === 'url-image' && (mediaItem as any)?.url) ? (
										<>
											<Image
												src={(mediaItem as any).url}
												alt={(mediaItem as any).alt?.toString?.() || (mediaItem as any).alt || "API image"}
												className="object-cover"
												fill
												sizes="(max-width: 768px) 100vw, 300px"
												unoptimized
											/>
											<div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs p-1 rounded z-10">
												URL: {(mediaItem as any).url}
											</div>
										</>
									) : ((mediaItem as any)?.type === 'url-video' && (mediaItem as any)?.url) ? (
										<video
											src={(mediaItem as any).url}
											className="w-full h-full object-cover"
											controls
											muted
										/>
									) : ((mediaItem as any)?.type === 'image' || (mediaItem as any)?.type === 'video') ? (
										<MediaComponent mediaItem={mediaItem} />
									) : (
										<div className="w-full h-full flex items-center justify-center text-muted-foreground">
											<div className="text-center">
												<X className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
												<p>Unsupported media type: {(mediaItem as any)?.type || 'unknown'}</p>
												<p className="text-xs mt-1">Expected: image, video, url-image, or url-video</p>
											</div>
										</div>
									)}
								</div>
							</div>
						))}
					</div>

					{/* Navigation arrows - only show when multiple images */}
					{mediaArray.length > 1 && (
						<>
							{/* Left arrow */}
							<button
								onClick={handlePrev}
								className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
								aria-label="Previous image"
							>
								<ChevronLeft className="w-6 h-6" />
							</button>

							{/* Right arrow */}
							<button
								onClick={handleNext}
								className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
								aria-label="Next image"
							>
								<ChevronRight className="w-6 h-6" />
							</button>
						</>
					)}
				</div>

				{/* Dot indicators - only show when multiple images */}
				{mediaArray.length > 1 && (
					<div className="flex justify-center gap-1.5 mt-3">
						{mediaArray.map((_, index) => (
							<button
								key={index}
								onClick={() => setCurrentIndex(index)}
								className={`w-2 h-2 rounded-full transition-all duration-200 ${
									index === currentIndex
										? 'bg-lime-500 w-4'
										: 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
								}`}
								aria-label={`Go to image ${index + 1}`}
							/>
						))}
					</div>
				)}

				{/* Simple add more button */}
				{handleImageUpload && (
					<div className="mt-3 flex justify-center">
						<Button
							variant="outline"
							size="2"
							onClick={handleImageUpload}
							className="flex items-center gap-2 text-foreground hover:text-lime-600 dark:text-lime-400 hover:border-lime-500 transition-colors duration-200"
						>
							<Plus className="w-4 h-4" />
							Add More
						</Button>
					</div>
				)}
			</div>

			{/* Simplified Delete Confirmation Modal */}
			{showDeleteConfirm && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<div className="bg-card rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
						<div className="text-center">
							<div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
								<Trash2 className="w-6 h-6 text-red-500" />
							</div>
							<h3 className="text-lg font-semibold text-foreground dark:text-white mb-2">Delete Media</h3>
							<p className="text-muted-foreground mb-6">
								Are you sure you want to delete this media?
							</p>
							
							<div className="flex gap-3 justify-center">
								<Button
									variant="outline"
									onClick={cancelDelete}
									disabled={isDeleting}
									className="px-4 py-2"
								>
									Cancel
								</Button>
								<Button
									variant="solid"
									onClick={confirmDelete}
									disabled={isDeleting}
									className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white"
								>
									{isDeleting ? (
										<>
											<RotateCcw className="w-4 h-4 mr-2 animate-spin" />
											Deleting...
										</>
									) : (
										'Delete'
									)}
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
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

	if (loading) {
		return (
			<div className="w-full h-[400px] bg-muted dark:bg-muted flex items-center justify-center">
				<div className="text-center">
					<div className="w-8 h-8 border-2 border-lime-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
					<p className="text-muted-foreground text-sm">Loading...</p>
				</div>
			</div>
		);
	}

	if (error || !imageUrl) {
		return (
			<div className="w-full h-[400px] bg-muted dark:bg-muted flex items-center justify-center">
				<div className="text-center">
					<X className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
					<p className="text-muted-foreground text-sm">Failed to load media</p>
				</div>
			</div>
		);
	}

	if (mediaItem?.type === 'image') {
		return (
			<div className="relative w-full h-[400px]">
				<Image
					src={imageUrl}
					alt={mediaItem.alt?.toString() || "uploaded image"}
					fill
					sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
					className="object-cover"
					onError={() => setError(true)}
					priority
				/>
			</div>
		);
	} else if (mediaItem?.type === 'video') {
		return (
			<div className="relative w-full h-[400px]">
				<video
					src={imageUrl}
					controls
					className="w-full h-full object-cover"
					onError={() => setError(true)}
				/>
			</div>
		);
	}

	return (
		<div className="w-full h-[400px] bg-muted dark:bg-muted flex items-center justify-center">
			<div className="text-center">
				<X className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
				<p className="text-muted-foreground text-sm">Unsupported media type</p>
			</div>
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