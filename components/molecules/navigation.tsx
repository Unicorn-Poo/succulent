import { Button } from "@radix-ui/themes";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useCallback } from "react";
import type { NavigationProps } from "@/types";

export const Navigation = memo(function Navigation({ title }: NavigationProps) {
	const router = useRouter();

	const handleBack = useCallback(() => {
		router.back();
	}, [router]);

	return (
		<div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200">
			{/* Back Button */}
			<Button
				variant="ghost"
				size="2"
				onClick={handleBack}
				className="flex items-center gap-2"
			>
				<ArrowLeft className="w-4 h-4" />
				Back
			</Button>

			{/* Optional Title */}
			{title && (
				<h1 className="text-2xl font-bold text-gray-900">{title}</h1>
			)}
		</div>
	);
}); 