import { useState, useRef, useEffect } from "react";

function Navbar({ user, currentView, onViewChange, onSignOut, onSignIn }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const avatarLetter = user?.user_metadata?.first_name
    ? user.user_metadata.first_name[0].toUpperCase()
    : user?.email ? user.email[0].toUpperCase() : "?";
  return (
    <nav className="navbar">
      <div className="navbar-content">
        <h1 className="navbar-title">Mutual Funds Calculator</h1>

        <div className="navbar-nav">
          <button
            className={`nav-link ${currentView === "calculator" ? "nav-link--active" : ""}`}
            onClick={() => onViewChange("calculator")}
          >
            Calculator
          </button>
          <button
            className={`nav-link ${currentView === "portfolio" ? "nav-link--active" : ""}`}
            onClick={() => onViewChange("portfolio")}
          >
            My Portfolio
          </button>
        </div>

        <div className="navbar-user">
          {user ? (
            <div className="avatar-menu" ref={menuRef}>
              <button className="avatar-btn" onClick={() => setMenuOpen(!menuOpen)}>
                {avatarLetter}
              </button>
              {menuOpen && (
                <div className="avatar-dropdown">
                  <div className="avatar-dropdown-email">{user.email}</div>
                  <button className="avatar-dropdown-item" onClick={() => { onSignOut(); setMenuOpen(false); }}>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="signin-btn" onClick={onSignIn}>
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
