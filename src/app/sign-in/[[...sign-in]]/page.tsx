import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F1117]">
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#B91C4D]">
            <span className="text-lg font-bold text-white">R</span>
          </div>
          <h1 className="text-xl font-semibold text-white">RoseStack Energy</h1>
          <p className="text-sm text-gray-400">Battery storage management platform</p>
        </div>
        <SignIn
          appearance={{
            variables: {
              colorPrimary: '#B91C4D',
              colorBackground: '#161822',
              colorText: '#F0F1F5',
              colorTextSecondary: '#9CA3AF',
              colorInputBackground: '#1F2133',
              colorInputText: '#F0F1F5',
              borderRadius: '8px',
            },
          }}
        />
      </div>
    </div>
  );
}
