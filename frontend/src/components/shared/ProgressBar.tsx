export default function ProgressBar({ value }:{value:number}) {
    return (
    <div className="mb-2">
        <div className={`progress`} style={{ marginTop: '-0.5rem', height: '0.5rem'}}>
            <div
            className={`progress-bar bg-${["danger", "warning", "info", "success"][value]}`}
            style={{ width: `${(value / 4) * 100}%` }}
            />
        </div>
    </div>
    )
}