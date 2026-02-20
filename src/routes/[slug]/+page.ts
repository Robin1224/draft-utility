import type { PageLoad } from './$types';

export const load: PageLoad = ({ params, url }) => {
	return {
		roomId: params.slug,
		username: url.searchParams.get('username') ?? undefined
	};
};