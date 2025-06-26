"use client";

import { useParams } from "next/navigation";
import { accountGroups } from "../../page";
import Image from "next/image";
import Link from "next/link";

export default function AccountGroupPage() {
	const params = useParams();
	const accountGroup = accountGroups.find(
		(group) => group.id === params.groupId
	);

	if (!accountGroup?.id) {
		return <div>No group id</div>;
	}
	return (
		<div>
			<div className="w-full mb-8">
				<h1 className="text-2xl font-bold">{accountGroup.name} Posts</h1>
				{/* {Object.entries(accountGroup.accounts).map(([key, account]) => (
        <div key={account.id}>{account.name}</div>
      ))} */}
			</div>
			{accountGroup.posts.map((post) => (
				<Link
					href={`/account-group/${accountGroup.id}/post/${post.variants.base.id}`}
					className="flex gap-2 border-y border-gray-200 py-2 hover:bg-gray-100/40 justify-between items-center"
					key={post.variants.base.id}
				>
					<div>{post.variants.base.text}</div>
					{post.variants.base.media && post.variants.base.media[0] && (
						<Image
							src={post.variants.base.media[0].image}
							alt="media"
							width={100}
							height={100}
						/>
					)}
				</Link>
			))}
		</div>
	);
}
