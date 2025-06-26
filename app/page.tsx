"use client";
import { Button } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
// import InstagramIcon from "../public/instagram.svg";
import Image from "next/image";

const svgImageIcon = (icon: any) => {
	return <Image src={icon} alt="icon" width={20} height={20} />;
};

export const platformIcons = {
	base: svgImageIcon("/sprout.svg"),
	instagram: svgImageIcon("/icons8-instagram.svg"),
	twitter: svgImageIcon("/icons8-twitter.svg"),
};

export const accountGroup1 = {
	id: "1",
	name: "Account Group 1",
	accounts: {
		sammiisparkle: {
			id: "1",
			platform: "instagram",
			name: "sammiisparkle",
			apiUrl: "https://www.instagram.com/sammiisparkle/",
		},
		sammiisparkle2: {
			id: "2",
			platform: "twitter",
			name: "sammiisparkle",
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
				sammiisparkle: {
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
export const accountGroups = [accountGroup1];

export default function Home() {
	const router = useRouter();

	return (
		<main className="">
			<h1 className="text-2xl font-bold">Welcome to Succulent</h1>
			{/* Account Group */}
			{accountGroups.map((group) => (
				<Button
					className="border-2 border-gray-300 text-bold rounded-md p-4 cursor-pointer"
					key={group.id}
					onClick={() => {
						console.log(group);
						router.push(`/account-group/${group.id}`);
					}}
				>
					<h2>{group.name}</h2>
					{/* {Object.entries(group.accounts).map(([key, account]) => (
              <div key={account.id}>{account.name}</div>
            ))} */}
				</Button>
			))}
		</main>
	);
}
