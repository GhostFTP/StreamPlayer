import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { APP_VERSION, CHANGELOG } from '../data/changelog.js';

export default function Changelog() {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />
      <div className="changelog-page">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <h1 className="changelog-title">Novedades</h1>
        <p className="changelog-subtitle">Versión actual: v{APP_VERSION}</p>

        <div className="changelog-list">
          {CHANGELOG.map(entry => (
            <div key={entry.version} className="changelog-entry">
              <div className="changelog-entry-header">
                <span className="changelog-version">v{entry.version}</span>
                <span className="changelog-date">{entry.date}</span>
              </div>
              <ul className="changelog-changes">
                {entry.changes.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
