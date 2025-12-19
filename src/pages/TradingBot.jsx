// ... inside TradingBotContainer ...

    const handleClearLogs = () => setLogsClearedTime(Date.now());

    // 🔴 REPLACE THE OLD SCROLL USEEFFECT WITH THIS "SMART SCROLL" VERSION:
    useEffect(() => { 
        const container = logsContainerRef.current;
        if (container) {
            // Calculate distance from bottom
            const { scrollTop, scrollHeight, clientHeight } = container;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

            // Only auto-scroll if user is within 150px of the bottom (monitoring mode)
            // OR if it's the very first log load (scrollTop is 0)
            const isNearBottom = distanceFromBottom < 150;

            if (isNearBottom) {
                container.scrollTo({ top: scrollHeight, behavior: 'smooth' });
            }
        }
    }, [persistentLogs, logFilter]);
