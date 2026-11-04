import { useState } from 'react';

/** O box model com medidas que a pessoa ajusta, e a conta da largura ocupada na tela. */
export default function BoxModel() {
  const [width, setWidth] = useState(300);
  const [padding, setPadding] = useState(20);
  const [border, setBorder] = useState(2);
  const [margin, setMargin] = useState(16);
  const [borderBox, setBorderBox] = useState(false);

  const content = borderBox ? Math.max(0, width - 2 * padding - 2 * border) : width;
  const visible = content + 2 * padding + 2 * border;
  const occupied = visible + 2 * margin;
  const scale = Math.min(1, 560 / occupied);

  const sliders = [
    { label: 'width', value: width, set: setWidth, min: 100, max: 400 },
    { label: 'padding', value: padding, set: setPadding, min: 0, max: 60 },
    { label: 'border', value: border, set: setBorder, min: 0, max: 20 },
    { label: 'margin', value: margin, set: setMargin, min: 0, max: 60 },
  ];

  return (
    <div className="boxlab">
      <div className="boxlab-stage">
        <div className="boxlab-margin" style={{ padding: margin * scale }} aria-hidden="true">
          <span className="boxlab-tag">margin</span>
          <div className="boxlab-border" style={{ padding: border * scale }}>
            <span className="boxlab-tag">border</span>
            <div className="boxlab-padding" style={{ padding: padding * scale }}>
              <span className="boxlab-tag">padding</span>
              <div className="boxlab-content" style={{ width: content * scale }}>
                conteúdo
                <br />
                {content}px
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="boxlab-sum" aria-live="polite">
        Largura visível: {content} + {padding} + {padding} + {border} + {border} = <strong>{visible}px</strong>
        {borderBox ? ' (igual ao width, porque o border-box inclui padding e borda)' : ' (width é só o conteúdo)'}.
        Espaço ocupado com as margens: <strong>{occupied}px</strong>.
      </p>
      <div className="boxlab-controls">
        {sliders.map((sl) => (
          <label key={sl.label}>
            <code>{sl.label}</code>: {sl.value}px
            <input type="range" min={sl.min} max={sl.max} value={sl.value} onChange={(e) => sl.set(Number(e.target.value))} />
          </label>
        ))}
        <div role="group" aria-label="box-sizing" className="boxlab-toggle">
          <code>box-sizing</code>:
          <button className={!borderBox ? 'filter active' : 'filter'} aria-pressed={!borderBox} onClick={() => setBorderBox(false)}>content-box</button>
          <button className={borderBox ? 'filter active' : 'filter'} aria-pressed={borderBox} onClick={() => setBorderBox(true)}>border-box</button>
        </div>
      </div>
    </div>
  );
}
