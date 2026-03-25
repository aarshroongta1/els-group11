function Navbar({ user, currentView, onViewChange, onSignOut, onSignIn }) {
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
            <>
              <span className="navbar-email">{user.email}</span>
              <button className="signout-btn" onClick={onSignOut}>
                Sign Out
              </button>
            </>
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
