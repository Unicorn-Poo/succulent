import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@radix-ui/themes";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface UploadedMediaPreviewProps {
	post: any; // Using any for now to avoid complex type issues
	activeTab: string;
}

export const UploadedMediaPreview = ({ post, activeTab }: UploadedMediaPreviewProps) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
	
	// Get media from the Jazz post object
	const media = post.variants[activeTab]?.media || [];
	const mediaArray = Array.from(media);

	const handleDeleteClick = (index: number) => {
		setDeleteIndex(index);
		setShowDeleteConfirm(true);
	};

	const confirmDelete = () => {
		if (deleteIndex !== null) {
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
		}
		setShowDeleteConfirm(false);
		setDeleteIndex(null);
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

	if (mediaArray.length === 0) return null;

	return (
		<>
			<div className="relative max-w-lg mx-auto">
				<div className="overflow-hidden rounded-lg shadow-md">
					<div
						className="flex transition-transform duration-300 ease-in-out"
						style={{ transform: `translateX(-${currentIndex * 100}%)` }}
					>
						{mediaArray.map((mediaItem: any, index) => (
							<div key={index} className="flex-shrink-0 w-full relative">
								<MediaComponent mediaItem={mediaItem} />
								<Button
									variant="soft"
									size="1"
									onClick={() => handleDeleteClick(index)}
									className="absolute top-2 right-2 !rounded-full !w-8 !h-8 bg-red-500 hover:bg-red-600 text-white shadow-lg transition-colors"
								>
									<X className="w-4 h-4" />
								</Button>
							</div>
						))}
					</div>
				</div>

				{mediaArray.length > 1 && (
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
							{mediaArray.map((_, index) => (
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

			{/* Delete Confirmation Modal */}
			{showDeleteConfirm && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
						<h3 className="text-lg font-semibold mb-4">Delete Image</h3>
						<p className="text-gray-600 mb-6">
							Are you sure you want to delete this image? This action cannot be undone.
						</p>
						<div className="flex gap-3 justify-end">
							<Button
								variant="soft"
								onClick={cancelDelete}
								className="px-4 py-2"
							>
								Cancel
							</Button>
							<Button
								variant="solid"
								onClick={confirmDelete}
								className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white"
							>
								Delete
							</Button>
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

	if (mediaItem?.type === 'image') {
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
	} else if (mediaItem?.type === 'video') {
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