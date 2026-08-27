type CloudLoaderProps = {
    visible?: boolean;
    fullscreen?: boolean;
    label?: string;
    className?: string;
};

export default function CloudLoader({
    visible = true,
    fullscreen = true,
    label = 'กำลังโหลด...',
    className = '',
}: CloudLoaderProps) {
    return (
        <div
            className={`${fullscreen ? 'loader-overlay' : 'loader-inline'} ${visible ? '' : 'loader-hidden'} ${className}`}
            role="status"
            aria-live="polite"
            aria-hidden={!visible}
        >
            <div className="cloud-container">
                <svg viewBox="7.87722 9.61948 33.01 16.88" aria-hidden="true">
                    <path d="M 12 26 H 37 C 42 26 41 20 37 20 C 38 18 37 15 33 16 C 32 8 15 8 14 17 C 8 16 6 25 12 26" className="cloud-back" />
                    <path d="M 12 26 H 37 C 42 26 41 20 37 20 C 38 18 37 15 33 16 C 32 8 15 8 14 17 C 8 16 6 25 12 26" className="cloud-front" />
                </svg>
                <span className="sr-only">{label}</span>
            </div>
        </div>
    );
}
