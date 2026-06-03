<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAddressRequest;
use App\Http\Requests\UpdateAddressRequest;
use App\Models\Address;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AddressController extends Controller
{
    /**
     * Get user addresses
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->integer('per_page', 15), 1), 100);

        $addresses = $request->user()->addresses()
            ->orderBy('is_default', 'desc')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $addresses->items(),
            'meta' => [
                'total' => $addresses->total(),
                'per_page' => $addresses->perPage(),
                'current_page' => $addresses->currentPage(),
                'last_page' => $addresses->lastPage(),
            ],
            'message' => __('messages.success'),
        ]);
    }

    /**
     * Create a new address
     */
    public function store(StoreAddressRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // If this is set as default, unset all others
        if ($request->boolean('is_default')) {
            $request->user()->addresses()->update(['is_default' => false]);
        }

        $address = $request->user()->addresses()->create($validated);

        return response()->json([
            'success' => true,
            'data' => $address,
            'message' => __('addresses.created'),
        ], 201);
    }

    /**
     * Update an address
     */
    public function update(UpdateAddressRequest $request, Address $address): JsonResponse
    {
        $address = $request->user()->addresses()->findOrFail($address->id);

        $validated = $request->validated();

        if ($request->boolean('is_default')) {
            $request->user()->addresses()->where('id', '!=', $address->id)->update(['is_default' => false]);
        }

        $address->update($validated);

        return response()->json([
            'success' => true,
            'data' => $address,
            'message' => __('addresses.updated'),
        ]);
    }

    /**
     * Delete an address
     */
    public function destroy(Request $request, Address $address): JsonResponse
    {
        $address = $request->user()->addresses()->findOrFail($address->id);

        $address->delete();

        return response()->json([
            'success' => true,
            'data' => [],
            'message' => __('addresses.deleted'),
        ]);
    }
}
