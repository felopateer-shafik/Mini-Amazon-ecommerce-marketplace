<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MediaAsset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->get('search', ''));
        $type = trim((string) $request->get('type', ''));

        $query = MediaAsset::query()->latest();

        if ($search !== '') {
            $query->where('name', 'like', "%{$search}%");
        }

        if (in_array($type, ['image', 'video', 'document'], true)) {
            $query->where('type', $type);
        }

        $media = $query->paginate(min(max((int) $request->integer('per_page', 30), 1), 100));

        return response()->json([
            'success' => true,
            'data' => $media->items(),
            'meta' => [
                'total' => $media->total(),
                'per_page' => $media->perPage(),
                'current_page' => $media->currentPage(),
                'last_page' => $media->lastPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'nullable|in:image,video,document',
            'size' => 'nullable|string|max:30',
            'url' => 'nullable|string|max:2048|required_without:file',
            'file' => 'nullable|file|mimes:jpg,jpeg,png,gif,webp,svg,bmp,avif,mp4,webm,mov,avi,mkv,m4v,pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv|max:102400|required_without:url',
        ]);

        $resolvedType = $data['type'] ?? null;
        $resolvedSize = $data['size'] ?? null;
        $resolvedUrl = trim((string) ($data['url'] ?? ''));

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $mime = (string) ($file->getClientMimeType() ?: '');
            $extension = strtolower((string) $file->getClientOriginalExtension());

            if (!$resolvedType) {
                if (Str::startsWith($mime, 'image/') || in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'], true)) {
                    $resolvedType = 'image';
                } elseif (Str::startsWith($mime, 'video/') || in_array($extension, ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'], true)) {
                    $resolvedType = 'video';
                } else {
                    $resolvedType = 'document';
                }
            }

            $safeExtension = $extension !== '' ? $extension : 'bin';
            $filename = Str::uuid()->toString() . '.' . $safeExtension;
            $targetDirectory = storage_path('app/public/media');
            File::ensureDirectoryExists($targetDirectory);
            $sizeBytes = (int) $file->getSize();
            $file->move($targetDirectory, $filename);
            $path = 'media/' . $filename;
            $resolvedUrl = Storage::disk('public')->url($path);

            if (!$resolvedSize) {
                if ($sizeBytes >= 1024 * 1024) {
                    $resolvedSize = round($sizeBytes / (1024 * 1024), 2) . ' MB';
                } elseif ($sizeBytes >= 1024) {
                    $resolvedSize = round($sizeBytes / 1024, 2) . ' KB';
                } else {
                    $resolvedSize = $sizeBytes . ' B';
                }
            }
        }

        $resolvedType = $resolvedType ?: 'document';
        $resolvedSize = $resolvedSize ?: '0 KB';

        $media = MediaAsset::create([
            'name' => $data['name'],
            'type' => $resolvedType,
            'size' => $resolvedSize,
            'url' => $resolvedUrl,
            'uploaded_by' => $request->user()?->id,
        ]);

        return response()->json([
            'success' => true,
            'data' => $media,
            'message' => __('messages.media_created'),
        ], 201);
    }

    public function destroy(MediaAsset $media): JsonResponse
    {
        $storagePath = $this->extractStoragePath($media->url);
        if ($storagePath) {
            Storage::disk('public')->delete($storagePath);
        }

        $media->delete();

        return response()->json([
            'success' => true,
            'message' => __('messages.media_deleted'),
        ]);
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:media_assets,id',
        ]);

        $items = MediaAsset::whereIn('id', $data['ids'])->get();
        foreach ($items as $item) {
            $storagePath = $this->extractStoragePath($item->url);
            if ($storagePath) {
                Storage::disk('public')->delete($storagePath);
            }
        }

        MediaAsset::whereIn('id', $data['ids'])->delete();

        return response()->json([
            'success' => true,
            'message' => __('messages.media_bulk_deleted'),
        ]);
    }

    private function extractStoragePath(?string $url): ?string
    {
        $normalized = trim((string) $url);
        if ($normalized === '') {
            return null;
        }

        $path = parse_url($normalized, PHP_URL_PATH) ?: '';
        $prefix = '/storage/';

        if (!Str::startsWith($path, $prefix)) {
            return null;
        }

        return ltrim(substr($path, strlen($prefix)), '/');
    }
}
