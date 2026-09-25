import { youtubePollingService } from "./src/integrations/channels/youtube.service.js";
(async () => {
  console.log("Checking YouTube Comments manually...");
  // Use any logic to see if checkYouTubeComments executes properly
  // Since checkYouTubeComments is private, we can use any hack
  await (youtubePollingService as any).checkYouTubeComments();
  console.log("Done");
  setTimeout(() => process.exit(0), 1000);
})();
