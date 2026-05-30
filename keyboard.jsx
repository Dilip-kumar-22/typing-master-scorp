/* 3D Keyboard — frequency / error heatmap + custom-key selector. */
const { useState, useEffect, useMemo } = React;

function Key({ def, isDown, isTarget, isSelected, heat, onClick, mode }) {
  let label, sub, char, w;
  if (Array.isArray(def)) {
    [char, sub] = def;
    label = char;
    w = '';
  } else {
    label = def.label;
    sub = '';
    char = def.code;
    w = def.w || '';
  }
  const heatClass = heat > 0 && mode !== 'select' ? `h-${heat}` : '';
  const targetClass = isTarget ? 'is-target' : '';
  const selectedClass = isSelected ? 'is-selected' : '';
  const downClass = isDown ? 'is-down' : '';

  return (
    <div
      className={`key ${w} ${heatClass} ${targetClass} ${selectedClass} ${downClass}`}
      onClick={() => onClick && onClick(char)}
    >
      <span className="legend">
        {sub && <span className="sub">{sub}</span>}
        {label}
      </span>
    </div>
  );
}

function Keyboard({
  activeKeys = new Set(),   // currently-held keys
  targetKeys = new Set(),   // keys highlighted as part of current mode
  heat = {},                // {char: 1-5}
  selected = new Set(),     // for custom-keys panel
  view = 'frequency',       // 'frequency' | 'errors' | 'select'
  onKeyClick,
}) {
  return (
    <div className="kb-stage">
      <div className="kb">
        {KB_ROWS.map((row, ri) => (
          <div className="kb-row" key={ri}>
            {row.map((def, ki) => {
              const char = Array.isArray(def) ? def[0] : def.code;
              const lower = (Array.isArray(def) ? def[0] : '').toLowerCase();
              const isTarget = targetKeys.has(lower);
              const isSelected = selected.has(lower);
              const isDown = activeKeys.has(lower) || activeKeys.has(char);
              const heatLvl = heat[lower] || 0;
              return (
                <Key
                  key={ki}
                  def={def}
                  isDown={isDown}
                  isTarget={isTarget}
                  isSelected={isSelected}
                  heat={heatLvl}
                  onClick={onKeyClick}
                  mode={view}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

window.Keyboard = Keyboard;
