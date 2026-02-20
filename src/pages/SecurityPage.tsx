import React from 'react';

interface SecurityPageProps {
  isDarkMode: boolean;
}

export default function SecurityPage({ isDarkMode }: SecurityPageProps) {
  return (
    <div className={`min-h-full px-6 py-10 ${isDarkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-50 text-gray-800'}`}>
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Security
          </h1>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Last updated: February 3, 2026
          </p>
        </header>

        <section className="space-y-3">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Platform Security
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Role‑based access control with organization scoping.</li>
            <li>Data isolation across organizations.</li>
            <li>Continuous monitoring and audit logging.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Data Protection
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Encryption in transit via TLS.</li>
            <li>Encrypted storage for sensitive assets.</li>
            <li>Access controls enforced at the data layer.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Reporting
          </h2>
          <p>
            For security questions or incident reports, contact your organization administrator or support.
          </p>
        </section>
      </div>
    </div>
  );
}
