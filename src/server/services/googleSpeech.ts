import { v1p1beta1 as speech } from '@google-cloud/speech';

export const textToSpeech = async (text: string) => {
	// TODO: integrate @google-cloud/text-to-speech if needed
	return { audioUrl: '' };
};

export const speechToText = async (audio: Buffer): Promise<{ transcript: string }> => {
	try {
		// Requires GOOGLE_APPLICATION_CREDENTIALS env or equivalent ADC
		const client = new speech.SpeechClient();
		const request = {
			config: {
				encoding: 'WEBM_OPUS' as const,
				languageCode: process.env.STT_LANGUAGE || 'en-US',
				enableAutomaticPunctuation: true,
				model: process.env.STT_MODEL || 'latest_long',
			},
			audio: {
				content: audio.toString('base64'),
			},
		} as const;

		const [response] = await client.recognize(request as any);
		const transcript = (response.results || [])
			.map((r) => r.alternatives?.[0]?.transcript || '')
			.filter(Boolean)
			.join(' ');
		return { transcript };
	} catch (err) {
		console.error('speechToText failed:', (err as Error).message);
		return { transcript: '' };
	}
}; 