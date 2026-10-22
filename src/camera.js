// DEV/CREATOR = tubaxn
export async function startCamera(video) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('getUserMedia unavailable (use https or localhost)');
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  return stream;
}
