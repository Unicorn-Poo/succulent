"use client";
import { Button } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Users } from "lucide-react";
import Image from "next/image";
import AccountGroupCreation from "../components/account-group-creation";
import Navigation from "../components/navigation";

const svgImageIcon = (icon: any) => {
	return <Image src={icon} alt="icon" width={20} height={20} />;
};

export const platformIcons = {
	base: svgImageIcon("/sprout.svg"),
	instagram: svgImageIcon("/icons8-instagram.svg"),
	twitter: svgImageIcon("/icons8-twitter.svg"),
};

interface AccountGroup {
	id: string;
	name: string;
	accounts: Record<string, {
		id: string;
		platform: string;
		name: string;
		profileKey?: string;
		isLinked: boolean;
		status: "pending" | "linked" | "error" | "expired";
		lastError?: string;
		// Legacy fields for backward compatibility
		apiUrl?: string;
		avatar?: string;
		username?: string;
		displayName?: string;
		url?: string;
	}>;
	posts: any[];
}

export const accountGroup1: AccountGroup = {
	id: "1",
	name: "Demo Account Group",
	accounts: {
		sammiisparkle_ig: {
			id: "1",
			platform: "instagram",
			name: "sammiisparkle",
			profileKey: "demo-profile-key-123",
			isLinked: true,
			status: "linked",
			apiUrl: "https://www.instagram.com/sammiisparkle/",
		},
		sammiisparkle_x: {
			id: "2",
			platform: "x",
			name: "sammiisparkle",
			profileKey: "demo-profile-key-123",
			isLinked: true,
			status: "linked",
			apiUrl: "https://www.twitter.com/sammiisparkle/",
		},
	},
	posts: [
		{
			title: "Heya!",
			variants: {
				base: {
					id: "1",
					text: "Hello, world!",
					postDate: new Date(),
					media: [
						{
							type: "image",
							image: "https://avatars.githubusercontent.com/u/40900195?v=4",
						},
					],
				},
				sammiisparkle_ig: {
					id: "1",
					text: "Hello, world! 🧚‍♀️",
					postDate: new Date(),
					createdAt: new Date(),
					updatedAt: new Date(),
					media: [
						{
							type: "image",
							image:
								"https://instagram.ffab1-1.fna.fbcdn.net/v/t51.2885-19/393370527_6704361799647927_5250405462319111161_n.jpg?_nc_ht=instagram.ffab1-1.fna.fbcdn.net&_nc_cat=103&_nc_oc=Q6cZ2QG2SsmHpa73AghFrP2P68-TqQ1FSztxOhlkfElFHEkLJgTMUZgzMYEPDk5JE87FFws&_nc_ohc=6D_ytYJWW3MQ7kNvwE6s28i&_nc_gid=QqWJb1HBLliJmjpJDn930A&edm=AP4sbd4BAAAA&ccb=7-5&oh=00_AfOAqQcTq6EHVJy4e90yq-HNb2V-_Mvi4xcExDYlmXkzWg&oe=6854C079&_nc_sid=7a9f4b",
						},
					],
          edited: true,
				},
			},
		},
		{
			title: "Hello to all the 🐟🐠🐡🐬🐳🐋🦈🦭🐡🐠🐟🦈🦭🐋🐬🐳",
			variants: {
				base: {
					id: "2",
					text: "Hello to all the fish!",
					postDate: new Date(),
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			},
		},
	],
};

export default function Home() {
	const router = useRouter();
	const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([accountGroup1]);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	const handleCreateGroup = (groupData: { name: string; accounts: Array<{ 
		id: string; 
		platform: string; 
		name: string; 
		profileKey?: string;
		isLinked: boolean;
		status: "pending" | "linked" | "error" | "expired";
		lastError?: string;
	}> }) => {
		const newGroup: AccountGroup = {
			id: (accountGroups.length + 1).toString(),
			name: groupData.name,
			accounts: groupData.accounts.reduce((acc, account) => {
				acc[account.id] = {
					id: account.id,
					platform: account.platform,
					name: account.name,
					profileKey: account.profileKey,
					isLinked: account.isLinked,
					status: account.status,
					lastError: account.lastError,
				};
				return acc;
			}, {} as Record<string, AccountGroup['accounts'][string]>),
			posts: [],
		};
		
		setAccountGroups([...accountGroups, newGroup]);
	};

	return (
		<div className="w-full max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold my-3">Welcome to Succulent</h1>

			{/* Account Groups */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<Button
					onClick={() => setIsCreateDialogOpen(true)}
					className="flex items-center gap-2"
				>
					<Plus className="w-4 h-4" />
					Create Account Group
				</Button>

				{accountGroups.map((group) => (
					<div
						key={group.id}
						className="border-2 border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors cursor-pointer"
						onClick={() => {
							console.log(group);
							router.push(`/account-group/${group.id}`);
						}}
					>
						<h2 className="text-lg font-semibold mb-2">{group.name}</h2>
						<div className="text-sm text-gray-600 mb-2">
							{Object.keys(group.accounts).length} account(s)
						</div>
						<div className="text-sm text-gray-600">
							{group.posts.length} post(s)
						</div>
					</div>
				))}
			</div>

			{/* Empty State */}
			{accountGroups.length === 0 && (
				<div className="text-center py-12">
					<div className="text-gray-500 mb-4">
						<Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
						<p>No account groups yet.</p>
						<p className="text-sm">Create your first account group to get started!</p>
					</div>
				</div>
			)}

			{/* Account Group Creation Dialog */}
			<AccountGroupCreation
				isOpen={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				onSave={handleCreateGroup}
			/>
		</div>
	);
}


export const accountGroups = [accountGroup1];
