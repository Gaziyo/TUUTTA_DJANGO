import { useState, useRef } from 'react';
import {
  Award,
  Download,
  Share2,
  Printer,
  CheckCircle,
  Calendar,
  Clock,
  Copy,
  ExternalLink,
  X,
  Shield
} from 'lucide-react';
import { Certificate, Course, LearningPath } from '../../types/lms';
import { exportCertificatesTemplate } from '../../lib/reportExport';

interface CertificateViewerProps {
  certificate: Certificate;
  course?: Course;
  learningPath?: LearningPath;
  userName: string;
  orgName: string;
  orgLogo?: string;
  onClose: () => void;
  isDarkMode?: boolean;
}

export function CertificateViewer({
  certificate,
  course,
  learningPath,
  userName,
  orgName,
  orgLogo,
  onClose,
  isDarkMode = false
}: CertificateViewerProps) {
  const [copied, setCopied] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  const title = course?.title || learningPath?.title || certificate.title;
  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const expiryDate = certificate.expiresAt
    ? new Date(certificate.expiresAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  const isExpired = certificate.expiresAt && certificate.expiresAt < Date.now();
  const daysUntilExpiry = certificate.expiresAt
    ? Math.ceil((certificate.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const copyVerificationUrl = async () => {
    try {
      await navigator.clipboard.writeText(certificate.verificationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (certificate.pdfUrl) {
      window.open(certificate.pdfUrl, '_blank');
    } else {
      // Generate PDF from the certificate view
      handlePrint();
    }
  };

  const handleBrandedDownload = async () => {
    await exportCertificatesTemplate(`certificate-${certificate.certificateNumber}`, [
      {
        orgName,
        orgLogo,
        certificateTitle: certificate.title,
        learnerName: userName,
        courseTitle: title,
        issuedAt: issuedDate,
        expiresAt: expiryDate,
        certificateNumber: certificate.certificateNumber,
        verificationUrl: certificate.verificationUrl,
        courseVersion: certificate.evidence?.courseVersion,
        assessmentScore: certificate.evidence?.assessmentScore
      }
    ]);
  };

  const handleShare = (platform: 'linkedin' | 'twitter' | 'email') => {
    const shareText = `I just earned my "${title}" certificate from ${orgName}!`;
    const shareUrl = certificate.verificationUrl;

    switch (platform) {
      case 'linkedin':
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
          '_blank'
        );
        break;
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
          '_blank'
        );
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(`Certificate: ${title}`)}&body=${encodeURIComponent(`${shareText}\n\nVerify at: ${shareUrl}`)}`;
        break;
    }
    setShowShareOptions(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl ${
        isDarkMode ? 'bg-gray-900' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between p-4 border-b ${
          isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Certificate of Completion
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowShareOptions(!showShareOptions)}
                className={`p-2 rounded-lg ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
                title="Share"
              >
                <Share2 size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
              </button>

              {showShareOptions && (
                <div className={`absolute right-0 top-12 w-48 rounded-lg shadow-lg py-2 z-20 ${
                  isDarkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <button
                    onClick={() => handleShare('linkedin')}
                    className={`w-full px-4 py-2 text-left text-sm ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    Share on LinkedIn
                  </button>
                  <button
                    onClick={() => handleShare('twitter')}
                    className={`w-full px-4 py-2 text-left text-sm ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    Share on X (Twitter)
                  </button>
                  <button
                    onClick={() => handleShare('email')}
                    className={`w-full px-4 py-2 text-left text-sm ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    Share via Email
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handlePrint}
              className={`p-2 rounded-lg ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
              title="Print"
            >
              <Printer size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
            </button>

            <button
              onClick={handleDownload}
              className={`p-2 rounded-lg ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
              title="Download PDF"
            >
              <Download size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
            </button>

            <button
              onClick={onClose}
              className={`p-2 rounded-lg ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <X size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
            </button>
          </div>
        </div>

        {/* Certificate Preview */}
        <div className="p-6">
          {/* Status Banner */}
          {isExpired ? (
            <div className="mb-4 p-4 rounded-lg bg-red-100 text-red-800 flex items-center gap-3">
              <Clock size={20} />
              <span>This certificate expired on {expiryDate}</span>
            </div>
          ) : daysUntilExpiry !== null && daysUntilExpiry <= 30 ? (
            <div className="mb-4 p-4 rounded-lg bg-yellow-100 text-yellow-800 flex items-center gap-3">
              <Clock size={20} />
              <span>This certificate will expire in {daysUntilExpiry} days ({expiryDate})</span>
            </div>
          ) : null}

          {/* Certificate Card */}
          <div
            ref={certificateRef}
            className="relative bg-gradient-to-br from-indigo-50 via-white to-purple-50 border-8 border-double border-indigo-200 rounded-lg p-8 print:shadow-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%236366f1' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E")`
            }}
          >
            {/* Decorative corners */}
            <div className="absolute top-4 left-4 w-12 h-12 border-l-4 border-t-4 border-indigo-400 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-12 h-12 border-r-4 border-t-4 border-indigo-400 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-12 h-12 border-l-4 border-b-4 border-indigo-400 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-12 h-12 border-r-4 border-b-4 border-indigo-400 rounded-br-lg" />

            <div className="text-center py-8">
              {/* Logo */}
              {orgLogo ? (
                <img
                  src={orgLogo}
                  alt={orgName}
                  className="h-16 mx-auto mb-4 object-contain"
                />
              ) : (
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Award className="text-white" size={32} />
                </div>
              )}

              {/* Organization Name */}
              <h3 className="text-sm font-medium text-indigo-600 tracking-widest uppercase mb-6">
                {orgName}
              </h3>

              {/* Certificate Title */}
              <h1 className="text-3xl font-serif text-gray-800 mb-2">
                Certificate of Completion
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 mx-auto mb-8" />

              {/* Presented to */}
              <p className="text-gray-600 mb-2">This is to certify that</p>
              <h2 className="text-4xl font-serif text-indigo-900 mb-6">
                {userName}
              </h2>

              {/* Course/Path completed */}
              <p className="text-gray-600 mb-2">has successfully completed</p>
              <h3 className="text-2xl font-semibold text-gray-800 mb-8">
                {title}
              </h3>

              {/* Date */}
              <p className="text-gray-600">
                Issued on <span className="font-medium text-gray-800">{issuedDate}</span>
              </p>

              {expiryDate && !isExpired && (
                <p className="text-gray-500 text-sm mt-1">
                  Valid until {expiryDate}
                </p>
              )}

              {/* Signature Line */}
              <div className="mt-12 flex justify-center">
                <div className="text-center">
                  <div className="w-48 h-px bg-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Authorized Signature</p>
                </div>
              </div>

              {/* Certificate Number */}
              <div className="mt-8 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Certificate ID: {certificate.certificateNumber}
                </p>
              </div>
            </div>
          </div>

          {/* Verification Section */}
          <div className={`mt-6 p-4 rounded-lg ${
            isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={20} className={isDarkMode ? 'text-green-400' : 'text-green-600'} />
              <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Verification
              </h4>
            </div>

            <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              This certificate can be verified using the URL below:
            </p>

            <div className="flex items-center gap-2">
              <div className={`flex-1 p-3 rounded-lg font-mono text-sm truncate ${
                isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700'
              }`}>
                {certificate.verificationUrl}
              </div>

              <button
                onClick={copyVerificationUrl}
                className={`p-3 rounded-lg transition-colors ${
                  copied
                    ? (isDarkMode ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-700')
                    : (isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300')
                }`}
                title={copied ? 'Copied!' : 'Copy URL'}
              >
                {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
              </button>

              <a
                href={certificate.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-3 rounded-lg ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
                title="Open Verification Page"
              >
                <ExternalLink size={20} />
              </a>
            </div>

            {(certificate.verificationCode || certificate.qrImageUrl) && (
              <div className="mt-4 flex flex-col md:flex-row gap-4 items-start">
                {certificate.qrImageUrl && (
                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
                    <img
                      src={certificate.qrImageUrl}
                      alt="Certificate verification QR"
                      className="w-28 h-28"
                    />
                  </div>
                )}
                {certificate.verificationCode && (
                  <div className={`flex-1 p-3 rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700'}`}>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Verification Code</p>
                    <p className="font-mono text-sm mt-1">{certificate.verificationCode}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className={`mt-6 grid grid-cols-2 gap-4`}>
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Issue Date
                </span>
              </div>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {issuedDate}
              </p>
            </div>

            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Expiry Date
                </span>
              </div>
              <p className={`font-medium ${
                isExpired
                  ? 'text-red-500'
                  : daysUntilExpiry !== null && daysUntilExpiry <= 30
                    ? 'text-yellow-500'
                    : (isDarkMode ? 'text-white' : 'text-gray-900')
              }`}>
                {expiryDate || 'No Expiration'}
              </p>
            </div>
            {certificate.evidence?.courseVersion !== undefined && (
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Course Version
                  </span>
                </div>
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {certificate.evidence.courseVersion}
                </p>
              </div>
            )}
            {certificate.evidence?.assessmentScore !== undefined && (
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart2 size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Assessment Score
                  </span>
                </div>
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {certificate.evidence.assessmentScore}%
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`sticky bottom-0 flex items-center justify-end gap-3 p-4 border-t ${
          isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg ${
              isDarkMode
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Download size={18} />
            Download PDF
          </button>
          <button
            onClick={() => { void handleBrandedDownload(); }}
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
              isDarkMode
                ? 'border-gray-600 text-gray-200 hover:bg-gray-800'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Download size={18} />
            Download Branded PDF
          </button>
        </div>
      </div>

      {/* Print Styles - These will only apply when printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none,
          .print\\:shadow-none * {
            visibility: visible;
            box-shadow: none !important;
          }
          .print\\:shadow-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

// Certificate List Component for displaying multiple certificates
interface CertificateListProps {
  certificates: Array<{
    certificate: Certificate;
    course?: Course;
    learningPath?: LearningPath;
  }>;
  userName: string;
  orgName: string;
  orgLogo?: string;
  onViewCertificate: (certificate: Certificate) => void;
  isDarkMode?: boolean;
}

export function CertificateList({
  certificates,
  onViewCertificate,
  isDarkMode = false
}: CertificateListProps) {
  if (certificates.length === 0) {
    return (
      <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <Award size={48} className="mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No Certificates Yet</p>
        <p className="text-sm">Complete courses to earn certificates!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {certificates.map(({ certificate, course, learningPath }) => {
        const title = course?.title || learningPath?.title || certificate.title;
        const isExpired = certificate.expiresAt && certificate.expiresAt < Date.now();
        const daysUntilExpiry = certificate.expiresAt
          ? Math.ceil((certificate.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        return (
          <div
            key={certificate.id}
            className={`relative p-4 rounded-xl border cursor-pointer transition-all hover:shadow-lg ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 hover:border-indigo-500'
                : 'bg-white border-gray-200 hover:border-indigo-300'
            }`}
            onClick={() => onViewCertificate(certificate)}
          >
            {/* Status Badge */}
            {isExpired ? (
              <div className="absolute top-3 right-3 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                Expired
              </div>
            ) : daysUntilExpiry !== null && daysUntilExpiry <= 30 ? (
              <div className="absolute top-3 right-3 px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                Expires Soon
              </div>
            ) : (
              <div className="absolute top-3 right-3 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                Valid
              </div>
            )}

            {/* Certificate Icon */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
              isExpired
                ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-100')
                : (isDarkMode ? 'bg-indigo-900' : 'bg-indigo-100')
            }`}>
              <Award
                size={24}
                className={isExpired
                  ? (isDarkMode ? 'text-gray-500' : 'text-gray-400')
                  : (isDarkMode ? 'text-indigo-400' : 'text-indigo-600')
                }
              />
            </div>

            {/* Title */}
            <h4 className={`font-medium mb-1 line-clamp-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {title}
            </h4>

            {/* Date */}
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Issued {new Date(certificate.issuedAt).toLocaleDateString()}
            </p>

            {/* View Button */}
            <button
              className={`mt-3 w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              View Certificate
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default CertificateViewer;
