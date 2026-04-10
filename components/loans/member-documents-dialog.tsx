'use client';

import {useEffect, useMemo, useState, useTransition} from 'react';
import {FileText, Download, Trash2, UploadCloud, X} from 'lucide-react';
import {createClient} from '@/lib/supabase/client';
import {useProfile} from '@/lib/hooks/use-profile';

type DocumentRow = {
  id: string;
  member_id: string;
  loan_id: string | null;
  document_type: string | null;
  notes: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
};

type Props = {
  memberId: string;
  memberName: string;
  loanId?: string | null;
  onClose: () => void;
};

const bucketName = 'member-documents';

const formatBytes = (bytes: number) => {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let index = 0;
  let value = bytes;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const sanitizeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9.\-_]/g, '_');

export function MemberDocumentsDialog({
  memberId,
  memberName,
  loanId,
  onClose
}: Props) {
  const supabase = createClient();
  const {profile} = useProfile();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState('');
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();

  const isAdmin = profile?.role === 'admin';

  const loadDocuments = async () => {
    setLoading(true);
    setError('');
    const {data, error: fetchError} = await supabase
      .from('member_documents')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', {ascending: false});
    if (fetchError) {
      setError(fetchError.message);
      setDocuments([]);
    } else {
      setDocuments((data ?? []) as DocumentRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadDocuments();
  }, [memberId]);

  const handleUpload = () => {
    if (files.length === 0) {
      setError('Select at least one document to upload.');
      return;
    }

    setError('');
    startTransition(async () => {
      for (const file of files) {
        const safeName = sanitizeFileName(file.name);
        const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const path = `members/${memberId}/${stamp}-${safeName}`;

        const {error: uploadError} = await supabase.storage
          .from(bucketName)
          .upload(path, file, {
            contentType: file.type || 'application/octet-stream',
            upsert: false
          });

        if (uploadError) {
          setError(uploadError.message);
          continue;
        }

        const {error: insertError} = await supabase.from('member_documents').insert({
          member_id: memberId,
          loan_id: loanId ?? null,
          document_type: documentType.trim() ? documentType.trim() : null,
          notes: notes.trim() ? notes.trim() : null,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          mime_type: file.type || null
        });

        if (insertError) {
          setError(insertError.message);
        }
      }

      setFiles([]);
      setDocumentType('');
      setNotes('');
      setSuccessMessage('Documents uploaded successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
      await loadDocuments();
    });
  };

  const handleDownload = async (doc: DocumentRow) => {
    setError('');
    const {data, error: urlError} = await supabase.storage
      .from(bucketName)
      .createSignedUrl(doc.file_path, 60 * 10);
    if (urlError || !data?.signedUrl) {
      setError(urlError?.message || 'Unable to create download link.');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async (doc: DocumentRow) => {
    if (!isAdmin) return;
    setError('');
    const {error: removeError} = await supabase.storage
      .from(bucketName)
      .remove([doc.file_path]);
    if (removeError) {
      setError(removeError.message);
      return;
    }
    const {error: deleteError} = await supabase
      .from('member_documents')
      .delete()
      .eq('id', doc.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadDocuments();
    setSuccessMessage('Document deleted successfully.');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const docCountLabel = useMemo(() => {
    if (documents.length === 0) return 'No documents yet';
    if (documents.length === 1) return '1 document';
    return `${documents.length} documents`;
  }, [documents.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Client Documents</h2>
            <p className="text-sm text-muted-foreground">
              {memberName} · {docCountLabel}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted">
            <X size={20} />
          </button>
        </div>

        {successMessage ? (
          <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {successMessage}
          </div>
        ) : null}
        <div className="mb-4 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Attach files
            </p>
            <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground hover:bg-muted/30">
              <UploadCloud size={16} />
              <span>{files.length > 0 ? `${files.length} files selected` : 'Choose files'}</span>
              <input
                type="file"
                className="hidden"
                multiple
                onChange={(event) =>
                  setFiles(Array.from(event.target.files ?? []))
                }
              />
            </label>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Document type
            </p>
            <input
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="e.g. Ward letter, Lease agreement"
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </p>
            <input
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="Optional notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <div className="md:col-span-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {loanId ? 'Linked to this loan.' : 'Stored under this client.'}
            </p>
            <button
              type="button"
              onClick={handleUpload}
              disabled={isPending}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {isPending ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex-1 overflow-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm">
              <tr>
                <th className="px-4 py-3 font-semibold">Document</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Uploaded</th>
                <th className="px-4 py-3 font-semibold">Size</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Loading documents...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No documents yet.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.file_name}</p>
                          {doc.notes ? (
                            <p className="text-xs text-muted-foreground">{doc.notes}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {doc.document_type ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {formatBytes(doc.file_size ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download size={12} /> Download
                        </button>
                        {isAdmin ? (
                          <button
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(doc)}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
