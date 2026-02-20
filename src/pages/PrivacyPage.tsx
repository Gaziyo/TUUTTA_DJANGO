import React from 'react';

interface PrivacyPageProps {
  isDarkMode: boolean;
}

export default function PrivacyPage({ isDarkMode }: PrivacyPageProps) {
  return (
    <div className={`min-h-full px-6 py-10 ${isDarkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-50 text-gray-800'}`}>
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Privacy Policy
          </h1>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Last updated: February 3, 2026
          </p>
        </header>

        <section className="space-y-3">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Overview
          </h2>
          <p>
            Tuutta collects and processes learning data to deliver AI‑powered training, analytics, and compliance insights.
            This policy explains what data we collect, how we use it, and your choices.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Data We Collect
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account details (name, email, organization).</li>
            <li>Learning activity (course progress, assessments, certifications).</li>
            <li>Uploaded content (documents, media, resources).</li>
            <li>Usage data (feature usage, performance, diagnostics).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            How We Use Data
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Deliver and improve learning experiences.</li>
            <li>Generate analytics and compliance reports.</li>
            <li>Provide AI personalization and tutoring.</li>
            <li>Maintain security and prevent abuse.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Your Rights
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access, export, or delete your data.</li>
            <li>Update or correct profile information.</li>
            <li>Contact your organization admin for enterprise policies.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Contact
          </h2>
          <p>
            For privacy inquiries, contact support or your organization administrator.
          </p>
        </section>
      </div>
    </div>
  );
}
