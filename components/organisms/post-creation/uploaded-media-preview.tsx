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
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [touchStart, setTouchStart] = useState<number | null>(null);
	const [touchEnd, setTouchEnd] = useState<number | null>(null);
	
	// Get media from the Jazz post object - check both active tab and base variant
	const media = post.variants[activeTab]?.media || post.variants.base?.media || [];
	const mediaArray = Array.from(media);

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
				{/* Simple carousel container with overlay controls */}
				<div className="relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
					<div
						className="flex transition-transform duration-300 ease-out"
						style={{ transform: `translateX(-${currentIndex * 100}%)` }}
						onTouchStart={handleTouchStart}
						onTouchMove={handleTouchMove}
						onTouchEnd={handleTouchEnd}
					>
						{mediaArray.map((mediaItem: any, index) => (
							<div key={index} className="flex-shrink-0 w-full">
								{/* Create a positioning wrapper that contains both media and controls */}
								<div className="relative w-full h-[400px]">
									<MediaComponent mediaItem={mediaItem} />
									
									{/* Controls positioned absolutely within this wrapper */}
									{index === currentIndex && (
										<>
											{/* Red danger delete button - top right corner */}
											<button
												onClick={(e) => handleDeleteClick(currentIndex, e)}
												className="absolute top-2 right-2 rounded-full w-8 h-8 bg-red-600 hover:bg-red-700 text-white opacity-100 transition-all duration-200 z-50 flex items-center justify-center"
												aria-label={`Delete current media`}
												style={{ zIndex: 1000 }}
											>
												<Trash2 className="w-4 h-4" />
											</button>

											{/* Simple dots indicator - bottom center */}
											{mediaArray.length > 1 && (
												<div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-50" style={{ zIndex: 1000 }}>
													{mediaArray.map((_, dotIndex) => (
														<button
															key={dotIndex}
															onClick={() => setCurrentIndex(dotIndex)}
															className={`w-3 h-3 rounded-full transition-all duration-200 ${
																currentIndex === dotIndex 
																	? 'bg-white shadow-lg scale-110' 
																	: 'bg-white/60 hover:bg-white/80 hover:scale-105'
															}`}
															aria-label={`Go to media ${dotIndex + 1}`}
														/>
													))}
												</div>
											)}
										</>
									)}
								</div>
							</div>
						))}
					</div>


				</div>

				{/* Simple add more button */}
				{handleImageUpload && (
					<div className="mt-3 flex justify-center">
						<Button
							variant="outline"
							size="2"
							onClick={handleImageUpload}
							className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-lime-600 hover:border-lime-500 transition-colors duration-200"
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
					<div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
						<div className="text-center">
							<div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
								<Trash2 className="w-6 h-6 text-red-500" />
							</div>
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Media</h3>
							<p className="text-gray-600 dark:text-gray-400 mb-6">
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
			<div className="w-full h-[400px] bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
				<div className="text-center">
					<div className="w-8 h-8 border-2 border-lime-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
					<p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
				</div>
			</div>
		);
	}

	if (error || !imageUrl) {
		return (
			<div className="w-full h-[400px] bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
				<div className="text-center">
					<X className="w-8 h-8 text-gray-400 mx-auto mb-2" />
					<p className="text-gray-400 text-sm">Failed to load media</p>
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
		<div className="w-full h-[400px] bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
			<div className="text-center">
				<X className="w-8 h-8 text-gray-400 mx-auto mb-2" />
				<p className="text-gray-400 text-sm">Unsupported media type</p>
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