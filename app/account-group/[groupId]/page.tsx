"use client";

import { useParams } from "next/navigation";
import { accountGroups } from "../../page";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@radix-ui/themes";
import { Plus, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AccountGroupPage() {
	const params = useParams();
	const router = useRouter();
	const accountGroup = accountGroups.find(
		(group) => group.id === params.groupId
	);

	if (!accountGroup?.id) {
		return (
			<div className="flex flex-col items-center justify-center py-12">
				<div className="text-center">
					<h2 className="text-xl font-semibold mb-2">Account Group Not Found</h2>
					<p className="text-gray-600 mb-4">The account group you're looking for doesn't exist.</p>
					<Button onClick={() => router.push("/")}>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Home
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full max-w-4xl">
			<div className="flex justify-between items-center mb-6">
				<div>
					<Button 
						variant="ghost" 
						onClick={() => router.push("/")}
						className="mb-2"
					>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Home
					</Button>
					<h1 className="text-2xl font-bold">{accountGroup.name}</h1>
				</div>
				<Button>
					<Plus className="w-4 h-4 mr-2" />
					Create New Post
				</Button>
			</div>

			{/* Account Group Info */}
			<div className="bg-gray-50 rounded-lg p-4 mb-6">
				<h3 className="font-semibold mb-2">Connected Accounts</h3>
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
					{Object.entries(accountGroup.accounts).map(([key, account]) => (
						<div key={account.id} className="flex items-center gap-2 p-2 bg-white rounded border">
							<div className="w-2 h-2 bg-green-500 rounded-full"></div>
							<span className="text-sm">{account.name}</span>
						</div>
					))}
				</div>
			</div>

			{/* Posts */}
			<div className="mb-4">
				<h2 className="text-xl font-semibold mb-4">Posts ({accountGroup.posts.length})</h2>
				
				{accountGroup.posts.length === 0 ? (
					<div className="text-center py-12 bg-gray-50 rounded-lg">
						<div className="text-gray-500 mb-4">
							<p className="text-lg mb-2">No posts yet</p>
							<p className="text-sm">Create your first post to get started!</p>
						</div>
						<Button>
							<Plus className="w-4 h-4 mr-2" />
							Create First Post
						</Button>
					</div>
				) : (
					<div className="space-y-2">
						{accountGroup.posts.map((post) => (
							<Link
								href={`/account-group/${accountGroup.id}/post/${post.variants.base.id}`}
								className="flex gap-4 border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
								key={post.variants.base.id}
							>
								<div className="flex-1">
									<h3 className="font-semibold mb-1">{post.title}</h3>
									<p className="text-gray-600 line-clamp-2">{post.variants.base.text}</p>
									<div className="text-xs text-gray-500 mt-2">
										{new Date(post.variants.base.postDate).toLocaleDateString()}
									</div>
								</div>
								{post.variants.base.media && post.variants.base.media[0] && (
									<div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
										<Image
											src={post.variants.base.media[0].image}
											alt="Post media"
											width={80}
											height={80}
											className="w-full h-full object-cover"
										/>
									</div>
								)}
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
