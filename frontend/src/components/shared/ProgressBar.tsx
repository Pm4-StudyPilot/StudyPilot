export default function ProgressBar({ value }:{value:number}) {
    const intValue = Math.min(3, Math.max(0, Math.round(value)))
    const floatValue = Math.min(3, Math.max(0, value))
    return (
    <div className="mb-2">
        <div className={`progress`} style={{ marginTop: '-0.5rem', height: '0.5rem'}}>
            <div
            role="progressbar"
            className={`progress-bar bg-${["danger", "warning", "info", "success"][intValue]}`}
            style={{ width: `${(floatValue / 4) * 100}%` }}
            />
        </div>
    </div>
    )
}