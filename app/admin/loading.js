export default function AdminLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading admin panel...</p>
      </div>
    </div>
  );
}
