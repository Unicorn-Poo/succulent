import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@radix-ui/themes";
import { ChevronLeft, ChevronRight, X, Trash2, Plus, Upload, RotateCcw } from "lucide-react";

interface UploadedMediaPreviewProps {
	post: any; // Using any for now to avoid complex type issues
	activeTab: string;
	handleImageUpload?: () => void;
}

export const UploadedMediaPreview = ({ post, activeTab, handleImageUpload }: UploadedMediaPreviewProps) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [draggedItem, setDraggedItem] = useState<number | null>(null);
	const [draggedOver, setDraggedOver] = useState<number | null>(null);
	const [touchStart, setTouchStart] = useState<number | null>(null);
	const [touchEnd, setTouchEnd] = useState<number | null>(null);
	
	// Get media from the Jazz post object
	const media = post.variants[activeTab]?.media || [];
	const mediaArray = Array.from(media);
	const fileInputRef = useRef<HTMLInputElement>(null);

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

	const handleGoToSlide = (index: number) => {
		setCurrentIndex(index);
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

	// Drag and drop handlers
	const handleDragStart = (e: React.DragEvent, index: number) => {
		setDraggedItem(index);
		e.dataTransfer.effectAllowed = 'move';
	};

	const handleDragOver = (e: React.DragEvent, index: number) => {
		e.preventDefault();
		setDraggedOver(index);
	};

	const handleDragLeave = () => {
		setDraggedOver(null);
	};

	const handleDrop = (e: React.DragEvent, dropIndex: number) => {
		e.preventDefault();
		
		if (draggedItem !== null && draggedItem !== dropIndex) {
			// Reorder items in the media array
			const draggedMediaItem = mediaArray[draggedItem];
			media.splice(draggedItem, 1);
			media.splice(dropIndex, 0, draggedMediaItem);
			
			// Update current index if needed
			if (currentIndex === draggedItem) {
				setCurrentIndex(dropIndex);
			}
		}
		
		setDraggedItem(null);
		setDraggedOver(null);
	};

	if (mediaArray.length === 0) return null;

	return (
		<>
			<div className="relative group">
				{/* Main carousel container */}
				<div className="relative overflow-hidden rounded-xl shadow-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
					<div
						className="flex transition-transform duration-300 ease-out"
						style={{ transform: `translateX(-${currentIndex * 100}%)` }}
						onTouchStart={handleTouchStart}
						onTouchMove={handleTouchMove}
						onTouchEnd={handleTouchEnd}
					>
						{mediaArray.map((mediaItem: any, index) => (
							<div 
								key={index} 
								className={`flex-shrink-0 w-full relative transition-all duration-200 ${
									draggedOver === index ? 'scale-95 opacity-80' : ''
								}`}
								draggable
								onDragStart={(e) => handleDragStart(e, index)}
								onDragOver={(e) => handleDragOver(e, index)}
								onDragLeave={handleDragLeave}
								onDrop={(e) => handleDrop(e, index)}
							>
								<MediaComponent mediaItem={mediaItem} />
								
								{/* Enhanced delete button */}
								<div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
									<Button
										variant="soft"
										size="1"
										onClick={(e) => handleDeleteClick(index, e)}
										className="!rounded-full !w-10 !h-10 bg-red-500/90 hover:bg-red-600 text-white shadow-lg backdrop-blur-sm border border-red-400/50 transition-all duration-200 hover:scale-110"
										aria-label={`Delete media ${index + 1}`}
									>
										<Trash2 className="w-4 h-4" />
									</Button>
								</div>

								{/* Drag handle indicator */}
								<div className="absolute top-3 left-3 opacity-0 group-hover:opacity-60 transition-opacity duration-200">
									<div className="flex flex-col gap-1 p-2 bg-white/20 rounded-lg backdrop-blur-sm">
										<div className="w-1 h-1 bg-white rounded-full"></div>
										<div className="w-1 h-1 bg-white rounded-full"></div>
										<div className="w-1 h-1 bg-white rounded-full"></div>
									</div>
								</div>

								{/* Media index indicator */}
								<div className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 text-white text-xs rounded-full backdrop-blur-sm">
									{index + 1}
								</div>
							</div>
						))}
					</div>

					{/* Navigation arrows */}
					{mediaArray.length > 1 && (
						<>
							<Button
								variant="soft"
								size="1"
								onClick={handlePrev}
								className="absolute top-1/2 left-3 transform -translate-y-1/2 !rounded-full !w-12 !h-12 bg-white/20 hover:bg-white/30 text-white shadow-lg backdrop-blur-md border border-white/20 transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100"
								aria-label="Previous media"
							>
								<ChevronLeft className="w-6 h-6" />
							</Button>
							<Button
								variant="soft"
								size="1"
								onClick={handleNext}
								className="absolute top-1/2 right-3 transform -translate-y-1/2 !rounded-full !w-12 !h-12 bg-white/20 hover:bg-white/30 text-white shadow-lg backdrop-blur-md border border-white/20 transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100"
								aria-label="Next media"
							>
								<ChevronRight className="w-6 h-6" />
							</Button>
						</>
					)}

					{/* Progress bar */}
					{mediaArray.length > 1 && (
						<div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
							<div 
								className="h-full bg-lime-500 transition-all duration-300 ease-out"
								style={{ width: `${((currentIndex + 1) / mediaArray.length) * 100}%` }}
							/>
						</div>
					)}
				</div>

				{/* Enhanced thumbnail indicators */}
				{mediaArray.length > 1 && (
					<div className="flex justify-center gap-2 mt-4 px-4">
						{mediaArray.map((mediaItem: any, index) => (
							<button
								key={index}
								onClick={() => handleGoToSlide(index)}
								className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
									currentIndex === index 
										? 'border-lime-500 shadow-lg shadow-lime-500/50 scale-110' 
										: 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
								}`}
								aria-label={`Go to media ${index + 1}`}
							>
								<MediaThumbnail mediaItem={mediaItem} />
								{currentIndex === index && (
									<div className="absolute inset-0 bg-lime-500/20 backdrop-blur-sm" />
								)}
							</button>
						))}
					</div>
				)}

				{/* Add more media button */}
				{handleImageUpload && (
					<div className="mt-4 flex justify-center">
						<Button
							variant="outline"
							size="2"
							onClick={handleImageUpload}
							className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-lime-500 to-green-600 hover:from-lime-600 hover:to-green-700 text-white border-none shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
						>
							<Plus className="w-5 h-5" />
							Add More Media
						</Button>
					</div>
				)}
			</div>

			{/* Enhanced Delete Confirmation Modal */}
			{showDeleteConfirm && (
				<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl transform transition-all duration-300 scale-100">
						<div className="text-center">
							<div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
								<Trash2 className="w-8 h-8 text-red-500" />
							</div>
							<h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Media</h3>
							<p className="text-gray-600 dark:text-gray-400 mb-6">
								Are you sure you want to delete this media? This action cannot be undone.
							</p>
							
							{/* Preview of item being deleted */}
							{deleteIndex !== null && mediaArray[deleteIndex] && (
								<div className="mb-6">
									<div className="w-24 h-24 mx-auto rounded-lg overflow-hidden border-2 border-red-200 dark:border-red-800">
										<MediaThumbnail mediaItem={mediaArray[deleteIndex] as any} />
									</div>
								</div>
							)}
							
							<div className="flex gap-3 justify-center">
								<Button
									variant="outline"
									onClick={cancelDelete}
									disabled={isDeleting}
									className="px-6 py-2 border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
								>
									Cancel
								</Button>
								<Button
									variant="solid"
									onClick={confirmDelete}
									disabled={isDeleting}
									className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-200"
								>
									{isDeleting ? (
										<>
											<RotateCcw className="w-4 h-4 mr-2 animate-spin" />
											Deleting...
										</>
									) : (
										<>
											<Trash2 className="w-4 h-4 mr-2" />
											Delete
										</>
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

const MediaThumbnail = ({ mediaItem }: { mediaItem: any }) => {
	const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
	const [thumbnailLoading, setThumbnailLoading] = useState(true);
	const [thumbnailError, setThumbnailError] = useState(false);

	useEffect(() => {
		if (!mediaItem) return;

		const loadMediaUrl = async () => {
			setThumbnailLoading(true);
			setThumbnailError(false);
			
			try {
				let url = null;
				
				if (mediaItem.type === "image" && mediaItem.image) {
					url = await extractMediaUrl(mediaItem.image);
				} else if (mediaItem.type === "video" && mediaItem.video) {
					url = await extractMediaUrl(mediaItem.video);
				}
				
				if (url) {
					setThumbnailUrl(url);
				} else {
					setThumbnailError(true);
				}
			} catch (err) {
				setThumbnailError(true);
			} finally {
				setThumbnailLoading(false);
			}
		};

		loadMediaUrl();
	}, [mediaItem]);

	if (thumbnailLoading) {
		return (
			<div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
				<div className="w-4 h-4 border-2 border-lime-500 border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}

	if (thumbnailError || !thumbnailUrl) {
		return (
			<div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
				<X className="w-4 h-4 text-gray-500" />
			</div>
		);
	}

	return (
		<Image
			src={thumbnailUrl}
			alt="Media thumbnail"
			fill
			className="object-cover"
			sizes="64px"
		/>
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
			<div className="w-full h-[500px] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
				<div className="text-center">
					<div className="w-16 h-16 border-4 border-lime-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
					<p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Loading media...</p>
					<div className="mt-3 w-32 h-2 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
						<div className="h-full bg-lime-500 rounded-full animate-pulse" style={{ width: '70%' }} />
					</div>
				</div>
			</div>
		);
	}

	if (error || !imageUrl) {
		return (
			<div className="w-full h-[500px] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
				<div className="text-center p-8">
					<div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4 mx-auto">
						<X className="w-10 h-10 text-red-500" />
					</div>
					<p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Failed to load media</p>
					<p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
						{mediaItem?.type === 'image' ? 'Image' : 'Video'} unavailable
					</p>
				</div>
			</div>
		);
	}

	if (mediaItem?.type === 'image') {
		return (
			<div className="relative w-full h-[500px] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
				<Image
					src={imageUrl}
					alt={mediaItem.alt?.toString() || "uploaded image"}
					fill
					sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
					className="object-cover transition-transform duration-300 hover:scale-105"
					onError={() => setError(true)}
					priority
				/>
				{/* Subtle overlay gradient */}
				<div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
			</div>
		);
	} else if (mediaItem?.type === 'video') {
		return (
			<div className="relative w-full h-[500px] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
				<video
					src={imageUrl}
					controls
					className="w-full h-full object-cover"
					onError={() => setError(true)}
				/>
				{/* Subtle overlay gradient */}
				<div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
			</div>
		);
	}

	return (
		<div className="w-full h-[500px] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
			<div className="text-center p-8">
				<div className="w-20 h-20 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center mb-4 mx-auto">
					<X className="w-10 h-10 text-gray-500" />
				</div>
				<p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Unsupported media type</p>
				<p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Type: {mediaItem?.type || 'unknown'}</p>
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