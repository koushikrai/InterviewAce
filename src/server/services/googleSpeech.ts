export const textToSpeech = async (text: string) => {
  // Dummy: Simulate Google TTS
  return { audioUrl: 'https://example.com/audio.mp3' };
};

export const speechToText = async (audio: any) => {
  // Dummy: Simulate Google STT
  return { transcript: 'This is a dummy transcript.' };
}; 