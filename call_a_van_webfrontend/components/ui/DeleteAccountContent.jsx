'use client';

export default function DeleteAccountContent() {
  return (
    <div className="w-full relative z-[1000] flex justify-center p-4 pt-10 pb-16 pointer-events-auto">
      <div className="bg-white w-full max-w-[600px] rounded-2xl shadow-2xl p-6 md:p-8 animate-fade-in h-fit border border-gray-100">
        <p className="text-[13px] font-medium text-[#0b51c1] mb-2">Call A Van / Callavan.live · Integriti Studio</p>
        <h1 className="text-[28px] font-bold text-[#003366] tracking-tight uppercase mb-3">
          Delete Account
        </h1>
        <p className="text-gray-600 text-[15px] leading-relaxed mb-6">
          Use this page to request deletion of your Call A Van driver account and the personal data linked to it.
          Customer / guest mode does not create an account.
        </p>

        <h2 className="text-[16px] font-bold text-gray-900 mb-3">How to request account deletion</h2>
        <ol className="list-decimal pl-5 space-y-2 text-gray-700 text-[15px] leading-relaxed mb-6">
          <li>Send an email to <span className="font-semibold text-gray-900">support@callavan.live</span>.</li>
          <li>Use the subject line: <span className="font-semibold text-gray-900">Account Deletion Request</span>.</li>
          <li>Include the email address registered to your driver account.</li>
          <li>Optionally include your full name and phone number so we can verify the account.</li>
          <li>We will confirm your request and delete the account after verification.</li>
        </ol>

        <a
          href="mailto:support@callavan.live?subject=Account%20Deletion%20Request"
          className="w-full flex items-center justify-between bg-[#f0f0f0] hover:bg-[#e4e4e4] transition-colors rounded-[12px] p-4 cursor-pointer text-decoration-none group shadow-sm mb-8"
        >
          <div className="flex items-center gap-3">
            <img
              src="https://cdn.prod.website-files.com/699f24e36021db019f687184/69e257e89c4e47c17f6aeb01_Container%20(1).svg"
              width="22"
              alt="Email"
            />
            <span className="text-gray-900 font-medium text-[15px]">Email support@callavan.live</span>
          </div>
          <img
            src="https://cdn.prod.website-files.com/699f24e36021db019f687184/69e25e39529b4ce0c8e3f35f_Icon.svg"
            alt="Arrow"
            className="opacity-50 group-hover:opacity-100 transition-opacity translate-x-0 group-hover:translate-x-1 duration-300"
          />
        </a>

        <h2 className="text-[16px] font-bold text-gray-900 mb-3">Data that is deleted</h2>
        <p className="text-gray-600 text-[15px] leading-relaxed mb-2">
          When your account deletion request is completed, we delete:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-gray-700 text-[15px] leading-relaxed mb-6">
          <li>Driver account and login credentials</li>
          <li>Name, email address, and phone number</li>
          <li>Company name, base area, vehicle details, bio, and services offered</li>
          <li>Profile photo and van photo</li>
          <li>Live / last location records associated with your driver account</li>
          <li>Password-reset codes and related session data we control</li>
        </ul>

        <h2 className="text-[16px] font-bold text-gray-900 mb-3">Data that may be kept</h2>
        <p className="text-gray-600 text-[15px] leading-relaxed mb-2">
          Some information may be retained only when needed for:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-gray-700 text-[15px] leading-relaxed mb-6">
          <li>Legal, accounting, or regulatory requirements</li>
          <li>Fraud prevention, security, or dispute resolution</li>
          <li>Backup systems for a limited recovery window before permanent removal</li>
        </ul>

        <h2 className="text-[16px] font-bold text-gray-900 mb-3">Processing time</h2>
        <p className="text-gray-600 text-[15px] leading-relaxed mb-6">
          We aim to process verified deletion requests within <span className="font-semibold text-gray-900">30 days</span>.
          Any legally required records are kept only for as long as the law requires, then deleted or anonymized.
        </p>

        <h2 className="text-[16px] font-bold text-gray-900 mb-3">Customers without an account</h2>
        <p className="text-gray-600 text-[15px] leading-relaxed mb-6">
          If you only used Call A Van as a customer / guest, you do not have a registered account.
          You can remove local app data by uninstalling the app and revoking location permission in your device settings.
        </p>

        <p className="text-gray-500 text-[13px] leading-relaxed">
          For privacy questions, see our{' '}
          <a href="/privacy-policy" className="text-[#0b51c1] font-medium hover:underline">
            Privacy Policy
          </a>
          {' '}or contact{' '}
          <a href="mailto:support@callavan.live" className="text-[#0b51c1] font-medium hover:underline">
            support@callavan.live
          </a>
          .
        </p>
      </div>
    </div>
  );
}
