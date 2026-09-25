import { youtubePollingService } from "./src/integrations/channels/youtube.service.js";
youtubePollingService.startPolling(2);
setTimeout(() => { process.exit(0); }, 15000);
