import React, { useState } from "react";

interface ISSLiveFeedProps {
    visible: boolean;
}

const FEED_URLS = [
    {
        id: "feed1",
        name: "NASA ISS Live Stream 1",
        url: "https://www.youtube.com/embed/aB1yRz0HhdY?autoplay=1&mute=1",
    },
    {
        id: "feed3",
        name: "Sen ISS Live Stream",
        url: "https://www.youtube.com/embed/fO9e9jnhYK8?autoplay=1&mute=1",
    },
    {
        id: "feed2",
        name: "NASA ISS Live Stream 2",
        url: "https://www.youtube.com/embed/FV4Q9DryTG8?autoplay=1&mute=1",
    },
];

const ISSLiveFeed: React.FC<ISSLiveFeedProps> = ({ visible }) => {
    const [selectedFeed, setSelectedFeed] = useState(FEED_URLS[0].url);
    const [isMuted, setIsMuted] = useState(true);

    if (!visible) return null;

    // Helper to get URL with current mute state
    const getFeedUrl = (url: string) => {
        // Remove existing mute param if present to avoid duplicates
        const baseUrl = url.replace(/&mute=[01]/, '').replace(/\?mute=[01]/, '');
        const separator = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}mute=${isMuted ? 1 : 0}`;
    };

    return (
        <div className="flex flex-col w-full bg-black/20 rounded overflow-hidden">
            <div className="p-3 border-b border-white/10 flex items-center gap-2">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                        Select Video Feed
                    </label>
                    <select
                        className="w-full bg-black/50 border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                        value={selectedFeed}
                        onChange={(e) => setSelectedFeed(e.target.value)}
                    >
                        {FEED_URLS.map((feed) => (
                            <option key={feed.id} value={feed.url}>
                                {feed.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col justify-end h-full pt-6">
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={`p-1.5 rounded border ${isMuted ? 'border-white/20 text-gray-400 hover:text-white' : 'border-blue-500/50 text-blue-400 bg-blue-500/10'} transition-colors`}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                        )}
                    </button>
                </div>
            </div>
            <div className="w-full aspect-video relative bg-black">
                <iframe
                    src={getFeedUrl(selectedFeed)}
                    title="ISS Live Feed"
                    className="absolute inset-0 w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            </div>
        </div>
    );
};

export default ISSLiveFeed;
