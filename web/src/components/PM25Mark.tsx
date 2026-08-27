import { Fragment, type ReactNode } from 'react';

export default function PM25Mark({ className = '' }: { className?: string }) {
    return (
        <span className={`pm25-mark ${className}`}>
            PM<span className="pm25-subscript">2.5</span>
        </span>
    );
}

export function PM25Text({ children }: { children: string }) {
    return children.split(/(PM(?:₂\.₅|2\.5))/g).map((part, index): ReactNode =>
        /^PM(?:₂\.₅|2\.5)$/.test(part)
            ? <PM25Mark key={index} />
            : <Fragment key={index}>{part}</Fragment>
    );
}
