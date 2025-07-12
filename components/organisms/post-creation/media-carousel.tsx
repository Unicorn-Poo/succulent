import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@radix-ui/themes";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MediaItem } from "../../../app/schema";

export const MediaCarousel = ({ media }: { media: MediaItem[] }) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [tempUploads, setTempUploads] = useState<any[]>([]);

	// Load temporary uploads from localStorage
	useEffect(() => {
		const uploads = JSON.parse(localStorage.getItem('temp_uploads') || '[]');
		setTempUploads(uploads);
	}, []);

	// Combine regular media with temporary uploads
	const allMedia = [...(media || []), ...tempUploads];

	const handlePrev = () => {
		setCurrentIndex((prevIndex) => (prevIndex === 0 ? allMedia.length - 1 : prevIndex - 1));
	};

	const handleNext = () => {
		setCurrentIndex((prevIndex) => (prevIndex === allMedia.length - 1 ? 0 : prevIndex + 1));
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
						<div key={index} className="flex-shrink-0 w-full">
							<MediaComponent mediaItem={mediaItem} />
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
						className="absolute top-1/2 left-2 transform -translate-y-1/2 !rounded-full !w-8 !h-8"
					>
						<ChevronLeft className="w-4 h-4" />
					</Button>
					<Button
						variant="soft"
						size="1"
						onClick={handleNext}
						className="absolute top-1/2 right-2 transform -translate-y-1/2 !rounded-full !w-8 !h-8"
					>
						<ChevronRight className="w-4 h-4" />
					</Button>
					<div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
						{allMedia.map((_, index) => (
							<button
								key={index}
								onClick={() => setCurrentIndex(index)}
								className={`w-2 h-2 rounded-full ${currentIndex === index ? 'bg-white' : 'bg-gray-400'}`}
							/>
						))}
					</div>
				</>
			)}
		</div>
	);
};

const MediaComponent = ({ mediaItem }: { mediaItem: any }) => {
	if (!mediaItem) return null;

	return (
		<div className="max-w-lg mx-auto">
			{mediaItem.type === "image" && (
				<Image
					src={mediaItem.image?.toString() ?? ""}
					alt={mediaItem.alt?.toString() ?? "image"}
					width={500}
					height={500}
					className="rounded-lg shadow-md w-full object-cover"
				/>
			)}
			{mediaItem.type === "video" && (
				<video
					src={mediaItem.video?.toString() ?? ""}
					controls
					className="w-full max-w-lg rounded-lg shadow-md"
				/>
			)}
		</div>
	);
}; 