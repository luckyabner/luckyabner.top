interface Project {
	title: string;
	description: string;
	url: string;
	icon: string;
}

export const projects: Project[] = [
	{
		title: 'Shutter',
		description: 'A photo display website based on Nextjs and Tencent Cloud COS.',
		url: 'https://shutter.luckyabner.top/',
		icon: '',
	},
	{
		title: 'MusicRoast',
		description: "An AI-powered application that provides different reviews of users' playlists.",
		url: 'https://music.luckyabner.top/',
		icon: '',
	},
	{
		title: 'HexVerse',
		description: 'An AI-powered fortune-telling application.',
		url: 'https://hexverse.luckyabner.top/',
		icon: '',
	},
	{
		title: 'EchoMemo',
		description:
			'An AI-enhanced thought capturing platform that provides intelligent feedback on your ideas.',
		url: 'https://echo.luckyabner.top/',
		icon: '',
	},
];
