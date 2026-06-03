<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Refund;

class RefundController extends Controller
{
    public function index(Request $request)
    {
        $refunds = Refund::where('user_id', $request->user()->id)
            ->with(['order'])
            ->latest()
            ->paginate(min(max((int) $request->get('per_page', 15), 1), 100));

        return response()->json([
            'success' => true,
            'data' => $refunds->items(),
            'meta' => [
                'total' => $refunds->total(),
                'per_page' => $refunds->perPage(),
                'current_page' => $refunds->currentPage(),
                'last_page' => $refunds->lastPage(),
            ],
        ]);
    }

    public function show(Request $request, $id)
    {
        $refund = Refund::where('user_id', $request->user()->id)
            ->with(['order', 'order.items'])
            ->findOrFail($id);

        return response()->json(['success' => true, 'data' => $refund]);
    }
}
