import React from 'react';

interface TermsPageProps {
  isDarkMode: boolean;
}

export default function TermsPage({ isDarkMode }: TermsPageProps) {
  return (
    <div className={`min-h-full px-6 py-10 ${isDarkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-50 text-gray-800'}`}>
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Terms of Service
          </h1>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Last updated: February 3, 2026
          </p>
        </header>

        <section className="space-y-3">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Agreement
          </h2>
          <p>
            By using Tuutta, you agree to these Terms. If you are using Tuutta on behalf of an organization,
            you represent that you have authority to bind that organization.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Use of Service
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the platform for lawful, authorized purposes.</li>
            <li>Do not upload content you do not have rights to use.</li>
            <li>Do not attempt to disrupt or compromise the service.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Accounts
          </h2>
          <p>
            You are responsible for maintaining the confidentiality of your credentials and for all activities
            under your account.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Changes
          </h2>
          <p>
            We may update these Terms periodically. Continued use after changes indicates acceptance.
          </p>
        </section>
      </div>
    </div>
  );
}
