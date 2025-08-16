import { useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Shield, Eye, Lock, Mail, Database, Globe, Scale } from 'lucide-react';
import qaaqLogo from '@assets/qaaq-logo.png';

export default function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = 'Privacy Policy - QaaqConnect';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      {/* Header */}
      <header className="bg-white text-black shadow-md relative overflow-hidden border-b-2 border-orange-400">
        <div className="absolute inset-0 bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 opacity-50"></div>
        
        <div className="relative z-10 px-4 py-3">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
                <img src={qaaqLogo} alt="QAAQ Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  QaaqConnect
                </h1>
                <p className="text-sm text-gray-600">Maritime Community Platform</p>
              </div>
            </div>
            <Link href="/" data-testid="link-back-home">
              <div className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Back to Home</span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          {/* Title Section */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Privacy Policy
            </h1>
            <p className="text-gray-600 text-lg">
              Your privacy and data security are our top priorities
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Last updated: August 16, 2025
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            
            {/* Introduction */}
            <section className="mb-8">
              <div className="flex items-center mb-4">
                <Globe className="h-6 w-6 text-orange-600 mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900">Introduction</h2>
              </div>
              <p className="text-gray-700 leading-relaxed">
                QaaqConnect ("we," "our," or "us") is committed to protecting and respecting your privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
                when you use our maritime community platform and related services.
              </p>
            </section>

            {/* Information We Collect */}
            <section className="mb-8">
              <div className="flex items-center mb-4">
                <Database className="h-6 w-6 text-orange-600 mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900">Information We Collect</h2>
              </div>
              
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">Personal Information</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Full name and professional credentials</li>
                    <li>Email address and contact information</li>
                    <li>Maritime rank, certifications, and company affiliation</li>
                    <li>Profile pictures and professional photos</li>
                    <li>WhatsApp number for bot services</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">Professional Information</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Maritime experience and expertise</li>
                    <li>Ship details and voyage information</li>
                    <li>Professional connections and network data</li>
                    <li>Questions, answers, and forum contributions</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">Technical Information</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Device information and browser details</li>
                    <li>IP address and location data</li>
                    <li>Usage patterns and app interactions</li>
                    <li>Authentication tokens and session data</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* How We Use Your Information */}
            <section className="mb-8">
              <div className="flex items-center mb-4">
                <Eye className="h-6 w-6 text-orange-600 mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900">How We Use Your Information</h2>
              </div>
              
              <div className="text-gray-700 space-y-3">
                <p>We use your information to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide and maintain our maritime community services</li>
                  <li>Connect you with relevant maritime professionals</li>
                  <li>Facilitate location-based discovery ("Koi Hai?" feature)</li>
                  <li>Enable Q&A functionality and knowledge sharing</li>
                  <li>Provide QBOT WhatsApp assistance services</li>
                  <li>Verify maritime credentials and professional status</li>
                  <li>Send important notifications and updates</li>
                  <li>Improve our platform and develop new features</li>
                  <li>Ensure platform security and prevent fraud</li>
                </ul>
              </div>
            </section>

            {/* Data Sharing */}
            <section className="mb-8">
              <div className="flex items-center mb-4">
                <Lock className="h-6 w-6 text-orange-600 mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900">Data Sharing and Disclosure</h2>
              </div>
              
              <div className="text-gray-700 space-y-4">
                <p>We may share your information in the following circumstances:</p>
                
                <div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">With Other Users</h3>
                  <p>Your profile information, professional credentials, and public contributions are visible to other verified maritime professionals on our platform.</p>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">Service Providers</h3>
                  <p>We share data with trusted third-party services including:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li>Google (for authentication and mapping services)</li>
                    <li>LinkedIn (for professional authentication)</li>
                    <li>Replit (for platform hosting and authentication)</li>
                    <li>WhatsApp/Meta (for bot messaging services)</li>
                    <li>Email service providers for notifications</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">Legal Requirements</h3>
                  <p>We may disclose information when required by law, court order, or to protect our rights and users' safety.</p>
                </div>
              </div>
            </section>

            {/* Data Security */}
            <section className="mb-8">
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 text-orange-600 mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900">Data Security</h2>
              </div>
              
              <div className="text-gray-700 space-y-3">
                <p>We implement industry-standard security measures including:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Encrypted data transmission (HTTPS/TLS)</li>
                  <li>Secure authentication with JWT tokens</li>
                  <li>Regular security audits and updates</li>
                  <li>Access controls and permission management</li>
                  <li>Secure database storage with backup procedures</li>
                  <li>Password hashing and credential protection</li>
                </ul>
                <p className="bg-orange-50 p-4 rounded-lg border border-orange-200 mt-4">
                  <strong>Note:</strong> While we strive to protect your information, no method of transmission over the internet is 100% secure. We encourage users to use strong passwords and enable available security features.
                </p>
              </div>
            </section>

            {/* Your Rights */}
            <section className="mb-8">
              <div className="flex items-center mb-4">
                <Scale className="h-6 w-6 text-orange-600 mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900">Your Rights and Choices</h2>
              </div>
              
              <div className="text-gray-700 space-y-3">
                <p>You have the right to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Access and review your personal information</li>
                  <li>Update or correct your profile data</li>
                  <li>Delete your account and associated data</li>
                  <li>Export your data in a portable format</li>
                  <li>Control your privacy settings and visibility</li>
                  <li>Opt-out of certain communications</li>
                  <li>Withdraw consent for data processing</li>
                </ul>
                <p className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
                  To exercise these rights, please contact us using the information provided below.
                </p>
              </div>
            </section>

            {/* Cookies and Tracking */}
            <section className="mb-8">
              <div className="flex items-center mb-4">
                <Eye className="h-6 w-6 text-orange-600 mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900">Cookies and Tracking</h2>
              </div>
              
              <div className="text-gray-700 space-y-3">
                <p>We use cookies and similar technologies to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Maintain your login session</li>
                  <li>Remember your preferences and settings</li>
                  <li>Analyze platform usage and performance</li>
                  <li>Provide personalized content and features</li>
                </ul>
                <p>You can control cookie settings through your browser, but some features may not function properly if cookies are disabled.</p>
              </div>
            </section>

            {/* International Transfers */}
            <section className="mb-8">
              <div className="flex items-center mb-4">
                <Globe className="h-6 w-6 text-orange-600 mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900">International Data Transfers</h2>
              </div>
              
              <div className="text-gray-700">
                <p>
                  As a global maritime platform, your information may be transferred to and processed in countries 
                  other than your own. We ensure appropriate safeguards are in place to protect your data during 
                  international transfers, in compliance with applicable data protection laws.
                </p>
              </div>
            </section>

            {/* Children's Privacy */}
            <section className="mb-8">
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 text-orange-600 mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900">Children's Privacy</h2>
              </div>
              
              <div className="text-gray-700">
                <p>
                  QaaqConnect is designed for maritime professionals and is not intended for use by individuals 
                  under 18 years of age. We do not knowingly collect personal information from children under 18. 
                  If we become aware that we have collected such information, we will take steps to delete it promptly.
                </p>
              </div>
            </section>

            {/* Changes to Policy */}
            <section className="mb-8">
              <div className="flex items-center mb-4">
                <Database className="h-6 w-6 text-orange-600 mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900">Changes to This Policy</h2>
              </div>
              
              <div className="text-gray-700">
                <p>
                  We may update this Privacy Policy from time to time to reflect changes in our practices or 
                  applicable laws. We will notify users of significant changes through the platform or via email. 
                  Your continued use of QaaqConnect after such modifications constitutes acceptance of the updated policy.
                </p>
              </div>
            </section>

            {/* Contact Information */}
            <section className="mb-8">
              <div className="flex items-center mb-4">
                <Mail className="h-6 w-6 text-orange-600 mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900">Contact Us</h2>
              </div>
              
              <div className="text-gray-700 space-y-3">
                <p>If you have questions about this Privacy Policy or our data practices, please contact us:</p>
                <div className="bg-gray-50 p-6 rounded-lg border">
                  <div className="space-y-2">
                    <p><strong>Email:</strong> privacy@qaaq.app</p>
                    <p><strong>Platform:</strong> QaaqConnect Support</p>
                    <p><strong>Response Time:</strong> We aim to respond within 48 hours</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Compliance */}
            <section className="mb-8">
              <div className="flex items-center mb-4">
                <Scale className="h-6 w-6 text-orange-600 mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900">Regulatory Compliance</h2>
              </div>
              
              <div className="text-gray-700">
                <p>
                  This Privacy Policy is designed to comply with applicable data protection regulations, 
                  including GDPR (European Union), CCPA (California), and other relevant privacy laws. 
                  We are committed to maintaining the highest standards of data protection and user privacy.
                </p>
              </div>
            </section>

          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              © 2025 QaaqConnect. All rights reserved. | Connecting maritime professionals worldwide.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}