import { useState } from "react";
import { supabase } from "../supabaseClient";

function AuthPage({ onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let result;
      if (isSignUp) {
        result = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { first_name: firstName, last_name: lastName },
          },
        });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }

      if (result.error) {
        setError(result.error.message);
      } else if (isSignUp) {
        // Email confirmation is enabled — user needs to verify before signing in
        setConfirmationSent(true);
      } else {
        if (onAuthSuccess) {
          onAuthSuccess(result.data.user);
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card-header">
          <h2 className="auth-card-title">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>
        </div>
        <div className="auth-card-body">
          {confirmationSent ? (
            <div className="auth-confirmation">
              <p className="auth-confirmation-text">
                A verification link has been sent to <strong>{email}</strong>. Please check your inbox and verify your email, then sign in.
              </p>
              <button
                className="button"
                onClick={() => {
                  setConfirmationSent(false);
                  setIsSignUp(false);
                  setError(null);
                }}
              >
                Go to Sign In
              </button>
            </div>
          ) : (
          <>
          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}

            {isSignUp && (
              <div className="auth-name-row">
                <div className="field">
                  <label className="label" htmlFor="auth-first-name">
                    First Name <span className="required">*</span>
                  </label>
                  <input
                    id="auth-first-name"
                    className="input"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="auth-last-name">
                    Last Name <span className="required">*</span>
                  </label>
                  <input
                    id="auth-last-name"
                    className="input"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="field">
              <label className="label" htmlFor="auth-email">
                Email <span className="required">*</span>
              </label>
              <input
                id="auth-email"
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="auth-password">
                Password <span className="required">*</span>
              </label>
              <input
                id="auth-password"
                className="input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button className="button" type="submit" disabled={loading}>
              {loading
                ? isSignUp
                  ? "Creating Account..."
                  : "Signing In..."
                : isSignUp
                  ? "Sign Up"
                  : "Sign In"}
            </button>
          </form>

          <div className="auth-toggle">
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <button
              className="auth-toggle-link"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
